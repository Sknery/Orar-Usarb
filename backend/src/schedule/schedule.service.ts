import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  ScheduleEntry,
  SearchOption,
  MasterLists,
  ScheduleResponseDto,
  UsarbApiLesson,
  UsarbApiMasterListItem,
} from './schedule.dto';
import { AxiosResponse } from 'axios';
import { addDays, parseISO, format } from 'date-fns';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Schedule } from './schedule.entity';
import { Group } from './group.entity';
import { Teacher } from './teacher.entity';
import { Office } from './office.entity';

@Injectable()
export class ScheduleService implements OnModuleInit {
  private readonly logger = new Logger(ScheduleService.name);
  private readonly ORAR_API_URL = 'https://orar.usarb.md/api';

  private cachedMasterLists: MasterLists = {
    group: null,
    teacher: null,
    office: null,
  };
  private isCachingInProgress = false;
  private cachePromise: Promise<void> | null = null;

  private professorColors = new Map<string, string>();
  
  private groupIdToNameMap = new Map<string, string>();

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Office)
    private readonly officeRepository: Repository<Office>,
  ) {}

  async onModuleInit() {
    await this.cacheMasterLists();
    
    const groups = this.cachedMasterLists.group;
    if (groups) {
      this.logger.log('[onModuleInit] Creating Group ID to Name lookup map...');
      for (const g of groups) {
        this.groupIdToNameMap.set(g.id, g.name);
      }
      this.logger.log(`[onModuleInit] Group map created with ${this.groupIdToNameMap.size} entries.`);
    }
  }

  async getSchedule(query: any): Promise<ScheduleResponseDto> {
    this.logger.log(
      `🔵 [getSchedule] Received request with query: ${JSON.stringify(query)}`,
    );

    // --- Ожидаем загрузки Мастер-листов (групп, учителей) ---
    if (this.isCachingInProgress && this.cachePromise) {
      this.logger.log('⏳ [getSchedule] Waiting for initial master list caching...');
      await this.cachePromise;
    } else if (!this.cachedMasterLists.group && !this.cachedMasterLists.teacher && !this.cachedMasterLists.office && !this.isCachingInProgress) {
      this.logger.warn(
        '⚠️ [getSchedule] Master lists not cached yet (onModuleInit failed?). Caching now and waiting...',
      );
      await this.cacheMasterLists();
      
      const groupsForMap = this.cachedMasterLists.group as SearchOption[] | null;
      
      if (groupsForMap && this.groupIdToNameMap.size === 0) {
         this.logger.log('[getSchedule] Re-creating Group ID to Name lookup map...');
         for (const g of groupsForMap) {
           this.groupIdToNameMap.set(g.id, g.name);
         }
      }
    }

    // --- Парсинг запроса ---
    const {
      grupe: group,
      profesori: teacher,
      aule: office,
      week,
      sem,
      startDateOfWeek,
    } = query;
    let lessons: UsarbApiLesson[] = [];
    const apiWeekParam = week ? parseInt(week, 10) : 0;
    const apiSemParam = sem ? parseInt(sem, 10) : 0;
    
    let cacheKeyType: string | null = null;
    let cacheKeyValue: string | null = null;
    if (group) { cacheKeyType = 'group'; cacheKeyValue = group; }
    else if (teacher) { cacheKeyType = 'professor'; cacheKeyValue = teacher; }
    else if (office) { cacheKeyType = 'classroom'; cacheKeyValue = office; }

    let baseDateOfWeek: Date | null = null;
    if (startDateOfWeek) {
      try { baseDateOfWeek = parseISO(startDateOfWeek); } 
      catch (e: any) { this.logger.error(`❌ [getSchedule] Failed to parse startDateOfWeek: ${startDateOfWeek} - ${e.message}`); }
    } else {
      this.logger.warn(`⚠️ [getSchedule] startDateOfWeek is missing in the request query.`);
    }

    // ---
    // --- НОВАЯ ЛОГИКА: API-First
    // ---
    this.logger.log(`[getSchedule] ℹ️ Attempting to fetch from API first...`);
    
    // 1. Пытаемся получить из API
    try {
      let targetId: string | null = null;
      let endpoint: string | null = null;
      let apiParams: Record<string, any> | null = null;
      const baseParams = { week: apiWeekParam, sem: apiSemParam, day: 1 };

      if (group) {
        targetId = this.findIdByName(group, 'group');
        if (targetId) { endpoint = 'getLessons'; apiParams = { ...baseParams, gr: targetId, grName: group }; }
      } else if (teacher) {
        targetId = this.findIdByName(teacher, 'teacher');
        if (targetId) { endpoint = 'getlessonsByTeacher'; apiParams = { ...baseParams, gr: targetId }; }
      } else if (office) {
        targetId = this.findIdByName(office, 'office');
        if (targetId) { endpoint = 'getlessonsByOffice'; apiParams = { ...baseParams, gr: targetId, grName: office }; }
      }

      if (endpoint && apiParams) {
        lessons = await this.fetchApiSchedule(endpoint, apiParams);
        this.logger.log(`[getSchedule] ✅ API Fetch success: ${lessons.length} lessons.`);
      } else {
        this.logger.warn(`[getSchedule] ❓ Could not find ID for query. ${JSON.stringify(query)}`);
        lessons = [];
      }
    } catch (error: any) {
      this.logger.error(`❌ [getSchedule] API Fetch failed: ${error.message}`);
      lessons = [];
    }

    // 2. Если API вернуло данные, обрабатываем их, сохраняем в БД и возвращаем
    if (lessons.length > 0) {
      const mappedLessons = this.mapApiLessons(lessons, group, office, baseDateOfWeek);
      const lessonsToSaveAndReturn = this.aggregateGroups(mappedLessons, group);

      this.saveScheduleToDb(lessonsToSaveAndReturn, cacheKeyType, cacheKeyValue, baseDateOfWeek)
          .catch(err => {
              this.logger.error(`❌ [getSchedule] Background DB save failed: ${err.message}`);
          });
      
      this.logger.log(`➡️ [getSchedule] Returning ${lessonsToSaveAndReturn.length} lessons from API.`);
      return {
        schedule: lessonsToSaveAndReturn,
        masterLists: this.cachedMasterLists,
      };
    }

    // 3. Если API НЕ вернуло данные (сбой или 0 уроков), ПРОВЕРЯЕМ КЭШ В БД
    this.logger.warn(`[getSchedule] ⚠️ API returned no data. Checking DB cache as fallback...`);
    
    if (cacheKeyType && cacheKeyValue && apiWeekParam && apiSemParam && baseDateOfWeek) {
      const startDate = baseDateOfWeek;
      const endDate = addDays(startDate, 6);
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      this.logger.log(`[getSchedule] Checking DB cache for ${cacheKeyType}='${cacheKeyValue}' between ${startDateStr} and ${endDateStr}`);

      const queryBuilder = this.scheduleRepository.createQueryBuilder("lesson")
        .where(`lesson.date BETWEEN :startDate AND :endDate`, { startDate: startDateStr, endDate: endDateStr });
      
      if (cacheKeyType === 'group') {
         queryBuilder.andWhere(`lesson.group LIKE :value`, { value: `%${cacheKeyValue}%` });
      } else {
         queryBuilder.andWhere(`lesson.${cacheKeyType} = :value`, { value: cacheKeyValue });
      }

      const cachedLessons = await queryBuilder.getMany();
      if (cachedLessons.length > 0) {
          this.logger.log(`[getSchedule] ✅ Found ${cachedLessons.length} lessons in DB cache (fallback).`);
          
          // --- ИЗМЕНЕНИЕ: Маппим с учетом updatedAt из БД ---
          const mappedCachedLessons: ScheduleEntry[] = cachedLessons.map(l => ({
              date: l.date,
              time: l.time,
              subject: l.subject,
              type: l.type as any, // Приведение типа, так как в БД это string
              professor: l.professor,
              professorColor: l.professorColor,
              classroom: l.classroom,
              group: l.group,
              updatedAt: l.updatedAt ? l.updatedAt.toISOString() : undefined // Передаем дату обновления
          }));

          return {
              schedule: mappedCachedLessons,
              masterLists: this.cachedMasterLists,
          };
      }
    }

    // 4. Если и в API, и в БД пусто, возвращаем пустой ответ
    this.logger.log(`[getSchedule] ℹ️ API and DB cache are both empty. Returning 0 lessons.`);
    return {
      schedule: [],
      masterLists: this.cachedMasterLists,
    };
  }
  
  // ---
  // --- Новые Вспомогательные методы для getSchedule ---
  // ---

  /**
   * Преобразует "сырые" уроки из API в наш формат ScheduleEntry.
   */
  private mapApiLessons(lessons: UsarbApiLesson[], group: string | null, office: string | null, baseDateOfWeek: Date | null): ScheduleEntry[] {
    // Текущее время для всех уроков, полученных из API
    const now = new Date().toISOString(); 

    return lessons.map((lesson) => {
      const professor = lesson.teacher_name || 'N/A';
      
      let groupName: string;
      if (group) { groupName = group; } 
      else if (lesson.Denumire) { groupName = lesson.Denumire; } 
      else if (lesson.group_id) { groupName = this.groupIdToNameMap.get(String(lesson.group_id)) || `ID:${lesson.group_id}`; }
      else { groupName = 'N/A'; }
      
      const classroomName = lesson.cours_office || (office ? office : 'N/A');

      let lessonDate = 'Invalid Date';
      if (baseDateOfWeek && lesson.day_number >= 1 && lesson.day_number <= 7) {
        try { lessonDate = format(addDays(baseDateOfWeek, lesson.day_number - 1), 'yyyy-MM-dd'); } 
        catch (e: any) { this.logger.error(`❌ Error calculating lesson date for day ${lesson.day_number}: ${e.message}`); lessonDate = 'Calculation Error'; }
      }
      
      return {
        date: lessonDate,
        time: this.mapCourseNumberToTime(lesson.cours_nr),
        subject: lesson.cours_name || 'N/A',
        type: this.mapApiLessonType(lesson.cours_type),
        professor: professor,
        professorColor: this.getProfessorColor(professor),
        classroom: classroomName,
        group: groupName,
        // --- НОВОЕ: Устанавливаем текущее время как время обновления ---
        updatedAt: now,
      };
    });
  }

  /**
   * "Склеивает" дублирующиеся пары, объединяя их группы (например, "IA-211, IS-211").
   */
  private aggregateGroups(mappedLessons: ScheduleEntry[], searchGroup: string | null): ScheduleEntry[] {
    if (searchGroup) {
      return mappedLessons; // Если поиск по группе, НЕ агрегируем.
    }

    this.logger.log(`[aggregateGroups] Поиск по учителю/аудитории. Запуск агрегации ${mappedLessons.length} уроков...`);
    const aggregatedLessonsMap = new Map<string, ScheduleEntry>();
    
    for (const lesson of mappedLessons) {
      const key = `${lesson.date}|${lesson.time}|${lesson.subject}|${lesson.professor}|${lesson.classroom}|${lesson.type}`;

      if (aggregatedLessonsMap.has(key)) {
        const existingLesson = aggregatedLessonsMap.get(key)!;
        const existingGroups = existingLesson.group.split(', ');
        if (!existingGroups.includes(lesson.group)) {
          existingLesson.group += `, ${lesson.group}`;
        }
      } else {
        aggregatedLessonsMap.set(key, { ...lesson }); // Копируем
      }
    }
    const aggregatedArray = Array.from(aggregatedLessonsMap.values());
    this.logger.log(`[aggregateGroups] Агрегация завершена. ${aggregatedArray.length} уникальных уроков.`);
    return aggregatedArray;
  }

  /**
   * Асинхронно очищает старые данные и сохраняет новые в БД.
   */
  private async saveScheduleToDb(lessons: ScheduleEntry[], cacheKeyType: string | null, cacheKeyValue: string | null, baseDateOfWeek: Date | null): Promise<void> {
    if (lessons.length === 0) {
      return;
    }
        
    this.logger.log(`[saveScheduleToDb] 💾 Saving ${lessons.length} lessons to DB...`);
    try {
      if (cacheKeyType && cacheKeyValue && baseDateOfWeek) {
         this.logger.log(`[saveScheduleToDb] Clearing old entries from DB cache before saving...`);
         const startDate = baseDateOfWeek;
         const endDate = addDays(startDate, 6);
         const startDateStr = format(startDate, 'yyyy-MM-dd');
         const endDateStr = format(endDate, 'yyyy-MM-dd');

         const deleteQueryBuilder = this.scheduleRepository.createQueryBuilder()
           .delete()
           .from(Schedule)
           .where(`date BETWEEN :startDate AND :endDate`, { startDate: startDateStr, endDate: endDateStr });

         if (cacheKeyType === 'group') {
            deleteQueryBuilder.andWhere(`group = :value`, { value: cacheKeyValue });
         } else if (cacheKeyType === 'professor') {
            deleteQueryBuilder.andWhere(`professor = :value`, { value: cacheKeyValue });
         } else if (cacheKeyType === 'classroom') {
            deleteQueryBuilder.andWhere(`classroom = :value`, { value: cacheKeyValue });
         }
         
         const deleteResult = await deleteQueryBuilder.execute();
         this.logger.log(`[saveScheduleToDb] Old entries cleared (${deleteResult.affected ?? 0} rows).`);
      }

      await this.scheduleRepository.save(lessons);
      this.logger.log(`[saveScheduleToDb] ✅ Successfully saved new lessons to DB.`);
    } catch (dbError: any) {
       this.logger.error(`❌ [saveScheduleToDb] ❌ Failed to save lessons to DB: ${dbError.message}`);
       throw dbError;
    }
  }

  // ---
  // --- Остальные Вспомогательные методы (без изменений) ---
  // ---

  private findIdByName(name: string, type: 'group' | 'teacher' | 'office'): string | null {
    const list = this.cachedMasterLists[type];
    if (!list) {
      this.logger.warn(`⚠️ [findIdByName] Master list for type '${type}' is not available.`);
      return null;
    }
    const item = list.find(opt => opt.name.trim().toLowerCase() === name.trim().toLowerCase());
    return item ? item.id : null;
  }

  private async fetchApiSchedule(endpoint: string, params: Record<string, any>): Promise<UsarbApiLesson[]> {
    const url = `${this.ORAR_API_URL}/${endpoint}`;
    const urlEncodedParams = new URLSearchParams();
    for (const key in params) { if (params[key] !== null && params[key] !== undefined) { urlEncodedParams.append(key, String(params[key])); } }
    const paramsString = urlEncodedParams.toString();
    this.logger.log(`📡 [fetchApiSchedule] Attempting: POST ${url} with params: ${paramsString}`);
    try {
      const response: AxiosResponse<any> = await firstValueFrom(this.httpService.post(url, paramsString, { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json, text/plain, */*', 'User-Agent': 'Mozilla/5.0...' }, timeout: 10000 }));
      this.logger.log(`📥 [fetchApiSchedule] Raw response from ${endpoint}. Status: ${response.status}.`);
      
      if (!response.data || typeof response.data !== 'object') { this.logger.warn(`⚠️ [fetchApiSchedule] Non-object data from ${endpoint}.`); return []; }
      if (!response.data.hasOwnProperty('week')) { this.logger.warn(`⚠️ [fetchApiSchedule] Missing 'week' property in response for ${endpoint}.`); return []; }
      const lessons = response.data.week;
      if (Array.isArray(lessons)) {
        this.logger.log(`✅ [fetchApiSchedule] Parsed ${lessons.length} lessons from 'week'.`);
        return lessons as UsarbApiLesson[];
      }
      return [];
    } catch (error) { 
      this.logger.error(`❌ [fetchApiSchedule] Error calling API ${endpoint}.`); 
      this.logAxiosError(error, endpoint); 
      throw error;
    }
  }

  private cacheMasterLists(): Promise<void> {
    if (this.isCachingInProgress && this.cachePromise) {
      return this.cachePromise;
    }

    this.isCachingInProgress = true;
    this.cachePromise = (async () => {
      
      try {
        const groupCount = await this.groupRepository.count();
        if (groupCount > 0) {
          this.cachedMasterLists.group = await this.groupRepository.find({order: {name: 'ASC'}});
        } else {
          const groupsResponse = await this.fetchMasterListApi('getGroups');
          if (Array.isArray(groupsResponse)) {
            const apiGroups = this.filterGroupList(groupsResponse);
            await this.groupRepository.save(apiGroups); 
            this.cachedMasterLists.group = apiGroups; 
          }
        }
      } catch (error: any) {
         this.logger.error(`❌ [cacheMasterLists] CRITICAL error processing GROUPS: ${error.message}`);
      }

      try {
        const teacherCount = await this.teacherRepository.count();
        if (teacherCount > 0) {
          this.cachedMasterLists.teacher = await this.teacherRepository.find({order: {name: 'ASC'}});
        } else {
          const teachersResponse = await this.fetchMasterListApi('getTeachers');
          if (Array.isArray(teachersResponse)) {
            const apiTeachers = this.processRawList(teachersResponse);
            await this.teacherRepository.save(apiTeachers); 
            this.cachedMasterLists.teacher = apiTeachers; 
          }
        }
      } catch (error: any) {
         this.logger.error(`❌ [cacheMasterLists] CRITICAL error processing TEACHERS: ${error.message}`);
      }

      try {
        const officeCount = await this.officeRepository.count();
        if (officeCount > 0) {
          this.cachedMasterLists.office = await this.officeRepository.find({order: {name: 'ASC'}});
        } else {
          const officesResponse = await this.fetchMasterListApi('getOffices');
          if (Array.isArray(officesResponse)) {
            const apiOffices = this.processRawList(officesResponse);
            await this.officeRepository.save(apiOffices); 
            this.cachedMasterLists.office = apiOffices; 
          }
        }
      } catch (error: any) {
         this.logger.error(`❌ [cacheMasterLists] CRITICAL error processing OFFICES: ${error.message}`);
      }
      
      this.isCachingInProgress = false;
      this.cachePromise = null;
    })();
    return this.cachePromise;
  }
  
  private async fetchMasterListApi(endpoint: string): Promise<UsarbApiMasterListItem[] | null> {
    try {
      const response = await firstValueFrom(this.httpService.post<UsarbApiMasterListItem[]>(`${this.ORAR_API_URL}/${endpoint}`, {}, { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0', Accept: 'application/json, text/plain, */*' }, timeout: 15000 }));
      if (Array.isArray(response?.data)) { return response.data; }
      else { return null; }
    } catch (error) { 
      this.logAxiosError(error, endpoint); 
      throw error;
    }
  }

  private processRawList(list: UsarbApiMasterListItem[]): SearchOption[] {
    const uniqueMap = new Map<string, SearchOption>();
    if (!Array.isArray(list)) return [];
    
    for (const item of list) {
      if (item && item.Id && item.Denumire && String(item.Denumire).trim() !== '') {
        const id = String(item.Id);
        const name = String(item.Denumire).trim();
        if (!uniqueMap.has(id)) {
          uniqueMap.set(id, { id, name });
        }
      }
    }
    
    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private filterGroupList(list: UsarbApiMasterListItem[]): SearchOption[] {
    const uniqueMap = new Map<string, SearchOption>();
    if (!Array.isArray(list)) return [];

    for (const item of list) {
      if (!item || typeof item.Denumire !== 'string' || !item.Id) continue;
      
      const denumire = item.Denumire.trim().toUpperCase();
      if (denumire === '') continue;

      const isOfficeRule = /^[0-9]/.test(denumire) || denumire.includes('AULA') || denumire === 'SALA SPORTIVĂ';
      const isInternalMarker = /\((RO|RU)\)$/.test(denumire) || / F$/.test(denumire) || / CF$/.test(denumire);

      if (isOfficeRule || isInternalMarker) {
        continue;
      }
      
      const id = String(item.Id);
      const name = String(item.Denumire).trim();

      if (!uniqueMap.has(id)) {
        uniqueMap.set(id, { id, name });
      }
    }
    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private mapCourseNumberToTime(courseNumber: number): string {
    const times: { [key: number]: string } = { 1: '08:00', 2: '09:45', 3: '11:30', 4: '13:15', 5: '15:00', 6: '16:45', 7: '18:30' };
    return times[courseNumber] || `Para ${courseNumber}?`;
  }

  private mapApiLessonType(apiType: string): ScheduleEntry['type'] {
    if (!apiType) return 'N/A';
    const upperApiType = apiType.trim().toUpperCase();
    const typeMap: { [key: string]: string } = {
      'PRELEGERI': 'Prelegere',
      'PRELEGERE': 'Prelegere',
      'LABORATOR': 'Laborator',
      'L': 'Prelegere',
      'S': 'Seminar',
      'P': 'Seminar',
      'LAB': 'Laborator',
      'SEMINAR': 'Seminar',
      'PRACTICĂ': 'Practică',
      'PROIECT DE CURS': 'Proiect de Curs',
      'EVALUARE PERIODICĂ': 'Evaluare periodică',
      'CONSULTAȚIE': 'Consultație',
      'EXAMINARE': 'Examinare',
      'REEXAMINARE': 'Reexaminare',
      'SEMINAR PREALABIL': 'Seminar prealabil',
      'SEMINAR DE TOTALIZARE': 'Seminar de totalizare',
    };
    return (typeMap[upperApiType] as ScheduleEntry['type']) || (apiType as ScheduleEntry['type']) || 'N/A';
  }

  private getProfessorColor(professorName: string): string {
    if (!professorName || professorName === 'N/A') { return '#cccccc'; }
    if (!this.professorColors.has(professorName)) {
      let hash = 0; for (let i = 0; i < professorName.length; i++) { hash = professorName.charCodeAt(i) + ((hash << 5) - hash); hash = hash & hash; }
      let color = '#'; for (let i = 0; i < 3; i++) { const value = (hash >> (i * 8)) & 0xff; const adjustedValue = Math.max(0, Math.min(255, Math.floor(value * 0.8 + 50))); color += ('00' + adjustedValue.toString(16)).substr(-2); }
      this.professorColors.set(professorName, color);
    }
    return this.professorColors.get(professorName)!;
  }

  private logAxiosError(error: any, context: string): void {
    if (error.response) { this.logger.error(`❌ Axios error (${context}): ${error.response.status} ${error.response.statusText}`); }
    else if (error.request) { this.logger.error(`❌ Axios error (${context}): No response received.`); }
    else { this.logger.error(`❌ Axios error (${context}): Request setup error.`); }
  }
}