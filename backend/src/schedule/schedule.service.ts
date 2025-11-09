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
    
    // --- ИЗМЕНЕНИЕ (Исправление TS Erorr): Используем локальную переменную для надежности ---
    const groups = this.cachedMasterLists.group;
    if (groups) {
      this.logger.log('[onModuleInit] Creating Group ID to Name lookup map...');
      for (const g of groups) { // Используем 'groups'
        this.groupIdToNameMap.set(g.id, g.name);
      }
      this.logger.log(`[onModuleInit] Group map created with ${this.groupIdToNameMap.size} entries.`);
    }
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
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
      
      // --- ИЗМЕНЕНИЕ (Исправление TS Error): Добавляем 'as' для
      //     уточнения типа после 'await' ---
      const groupsForMap = this.cachedMasterLists.group as SearchOption[] | null;
      
      if (groupsForMap && this.groupIdToNameMap.size === 0) {
         this.logger.log('[getSchedule] Re-creating Group ID to Name lookup map...');
         // 'groupsForMap' теперь 'SearchOption[]'
         for (const g of groupsForMap) {
           this.groupIdToNameMap.set(g.id, g.name);
         }
      }
      // --- КОНЕЦ ИЗМЕНЕНИЯ ---
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
      catch (e) { this.logger.error(`❌ [getSchedule] Failed to parse startDateOfWeek: ${startDateOfWeek} - ${e.message}`); }
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
    } catch (error) {
      this.logger.error(`❌ [getSchedule] API Fetch failed: ${error.message}`);
      lessons = []; // Гарантируем, что lessons - это массив, на случай сбоя
    }

    // 2. Если API вернуло данные, обрабатываем их, сохраняем в БД и возвращаем
    if (lessons.length > 0) {
      const mappedLessons = this.mapApiLessons(lessons, group, office, baseDateOfWeek);
      const lessonsToSaveAndReturn = this.aggregateGroups(mappedLessons, group);

      // Сохраняем в БД (асинхронно, в "фоне")
      // Мы не ждем (await) этого, чтобы вернуть ответ пользователю как можно быстрее.
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
          return {
              schedule: cachedLessons,
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
        catch (e) { this.logger.error(`❌ Error calculating lesson date for day ${lesson.day_number}: ${e.message}`); lessonDate = 'Calculation Error'; }
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
    } catch (dbError) {
       this.logger.error(`❌ [saveScheduleToDb] ❌ Failed to save lessons to DB: ${dbError.message}`);
       // Выбрасываем ошибку, чтобы вызывающая функция могла ее поймать
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
    if (item) { /*this.logger.log(`✅ [findIdByName] Found ID ${item.id} for '${name}'`);*/ }
    else { this.logger.warn(`❓ [findIdByName] Item not found for '${name}' (type: ${type}).`); }
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
      const responseBodyString = JSON.stringify(response.data);
      if (responseBodyString.length < 500) { this.logger.log(`📦 [fetchApiSchedule] Body: ${responseBodyString}`); }
      else { this.logger.log(`📦 [fetchApiSchedule] Body (truncated): ${responseBodyString.substring(0, 500)}...`); }
      if (!response.data || typeof response.data !== 'object') { this.logger.warn(`⚠️ [fetchApiSchedule] Non-object data from ${endpoint}. Data: ${response.data}`); return []; }
      if (!response.data.hasOwnProperty('week')) { this.logger.warn(`⚠️ [fetchApiSchedule] Missing 'week' property in response for ${endpoint}. Full response: ${JSON.stringify(response.data)}`); return []; }
      const lessons = response.data.week;
      if (Array.isArray(lessons)) {
        if (lessons.length > 0 && typeof lessons[0] !== 'object') { this.logger.warn(`⚠️ [fetchApiSchedule] 'week' array has non-object elements for ${endpoint}.`); return []; }
        this.logger.log(`✅ [fetchApiSchedule] Parsed ${lessons.length} lessons from 'week'.`);
        return lessons as UsarbApiLesson[];
      }
      this.logger.warn(`⚠️ [fetchApiSchedule] 'week' is not an array for ${endpoint}: ${JSON.stringify(response.data)}`);
      return [];
    } catch (error) { 
      this.logger.error(`❌ [fetchApiSchedule] Error calling API ${endpoint}.`); 
      this.logAxiosError(error, endpoint); 
      // Выбрасываем ошибку, чтобы 'getSchedule' мог ее поймать
      throw error;
    }
  }

  // ---
  // --- Логика кэширования МАСТЕР-ЛИСТОВ (Группы, Учителя, Аудитории)
  // ---
  private cacheMasterLists(): Promise<void> {
    if (this.isCachingInProgress && this.cachePromise) {
      this.logger.log('⏳ [cacheMasterLists] Caching in progress (awaiting)...');
      return this.cachePromise;
    }

    this.isCachingInProgress = true;
    this.logger.log('⏳ [cacheMasterLists] Starting master list caching...');

    this.cachePromise = (async () => {
      
      // --- 1. Process Groups ---
      try {
        const groupCount = await this.groupRepository.count();
        if (groupCount > 0) {
          this.cachedMasterLists.group = await this.groupRepository.find({order: {name: 'ASC'}});
          this.logger.log(`✅ [cacheMasterLists] Loaded ${groupCount} groups from DB.`);
        } else {
          this.logger.warn('⚠️ [cacheMasterLists] Groups table is empty. Fetching from API...');
          const groupsResponse = await this.fetchMasterListApi('getGroups');
          if (Array.isArray(groupsResponse)) {
            const apiGroups = this.filterGroupList(groupsResponse); // Фильтруем И убираем дубликаты
            await this.groupRepository.save(apiGroups); 
            this.cachedMasterLists.group = apiGroups; 
            this.logger.log(`✅ [cacheMasterLists] Fetched and saved ${apiGroups.length} groups.`);
          } else {
            this.logger.error('❌ [cacheMasterLists] Failed to fetch groups from API.');
          }
        }
      } catch (error) {
         this.logger.error(`❌ [cacheMasterLists] CRITICAL error processing GROUPS: ${error.message}`);
      }

      // --- 2. Process Teachers ---
      try {
        const teacherCount = await this.teacherRepository.count();
        if (teacherCount > 0) {
          this.cachedMasterLists.teacher = await this.teacherRepository.find({order: {name: 'ASC'}});
          this.logger.log(`✅ [cacheMasterLists] Loaded ${teacherCount} teachers from DB.`);
        } else {
          this.logger.warn('⚠️ [cacheMasterLists] Teachers table is empty. Fetching from API...');
          const teachersResponse = await this.fetchMasterListApi('getTeachers');
          if (Array.isArray(teachersResponse)) {
            const apiTeachers = this.processRawList(teachersResponse); // Убираем дубликаты
            await this.teacherRepository.save(apiTeachers); 
            this.cachedMasterLists.teacher = apiTeachers; 
            this.logger.log(`✅ [cacheMasterLists] Fetched and saved ${apiTeachers.length} teachers.`);
          } else {
            this.logger.error('❌ [cacheMasterLists] Failed to fetch teachers from API.');
          }
        }
      } catch (error) {
         this.logger.error(`❌ [cacheMasterLists] CRITICAL error processing TEACHERS: ${error.message}`);
      }

      // --- 3. Process Offices ---
      try {
        const officeCount = await this.officeRepository.count();
        if (officeCount > 0) {
          this.cachedMasterLists.office = await this.officeRepository.find({order: {name: 'ASC'}});
          this.logger.log(`✅ [cacheMasterLists] Loaded ${officeCount} offices from DB.`);
        } else {
          this.logger.warn('⚠️ [cacheMasterLists] Offices table is empty. Fetching from API...');
          const officesResponse = await this.fetchMasterListApi('getOffices');
          if (Array.isArray(officesResponse)) {
            const apiOffices = this.processRawList(officesResponse); // Убираем дубликаты
            await this.officeRepository.save(apiOffices); 
            this.cachedMasterLists.office = apiOffices; 
            this.logger.log(`✅ [cacheMasterLists] Fetched and saved ${apiOffices.length} offices.`);
          } else {
            this.logger.error('❌ [cacheMasterLists] Failed to fetch offices from API.');
          }
        }
      } catch (error) {
         this.logger.error(`❌ [cacheMasterLists] CRITICAL error processing OFFICES: ${error.message}`);
      }
      
      this.isCachingInProgress = false;
      this.cachePromise = null;
      this.logger.log('🏁 [cacheMasterLists] Caching finished.');
      this.logger.log(`ℹ️ [cacheMasterLists] Memory cache state: G:${this.cachedMasterLists.group?.length ?? 0}, T:${this.cachedMasterLists.teacher?.length ?? 0}, O:${this.cachedMasterLists.office?.length ?? 0}`);

    })();
    return this.cachePromise;
  }
  
  private async fetchMasterListApi(endpoint: string): Promise<UsarbApiMasterListItem[] | null> {
    this.logger.log(`📡 [fetchMasterListApi] Fetching: POST ${this.ORAR_API_URL}/${endpoint}`);
    try {
      const response = await firstValueFrom(this.httpService.post<UsarbApiMasterListItem[]>(`${this.ORAR_API_URL}/${endpoint}`, {}, { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0', Accept: 'application/json, text/plain, */*' }, timeout: 15000 }));
      this.logger.log(`📥 [fetchMasterListApi] Raw response for ${endpoint}: ${JSON.stringify(response.data)?.substring(0, 100)}...`);
      if (Array.isArray(response?.data)) { this.logger.log(`✅ [fetchMasterListApi] Parsed array for ${endpoint}. Length: ${response.data.length}`); return response.data; }
      else { this.logger.warn(`⚠️ [fetchMasterListApi] Invalid format for ${endpoint}. Expected array, got: ${typeof response?.data}`); return null; }
    } catch (error) { 
      this.logger.error(`❌ [fetchMasterListApi] Error fetching ${endpoint}.`); 
      this.logAxiosError(error, endpoint); 
      // Выбрасываем ошибку, чтобы 'cacheMasterLists' мог ее поймать
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
        if (!uniqueMap.has(id)) { // Убираем дубликаты по ID
          uniqueMap.set(id, { id, name });
        }
      }
    }
    
    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private filterGroupList(list: UsarbApiMasterListItem[]): SearchOption[] {
    const uniqueMap = new Map<string, SearchOption>();
    if (!Array.isArray(list)) {
      this.logger.warn('⚠️ [filterGroupList] Input not an array.');
      return [];
    }

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

      if (!uniqueMap.has(id)) { // Убираем дубликаты по ID
        uniqueMap.set(id, { id, name });
      }
    }
    
    const filtered = Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    
    this.logger.log(`🔎 [filterGroupList] Processed ${list.length} raw items -> ${filtered.length} unique, filtered groups.`);
    return filtered;
  }

  private mapCourseNumberToTime(courseNumber: number): string {
    const times: { [key: number]: string } = { 1: '08:00', 2: '09:45', 3: '11:30', 4: '13:15', 5: '15:00', 6: '16:45', 7: '18:30' };
    if (!times[courseNumber]) { this.logger.warn(`❓ [mapCourseNumberToTime] Unknown course number: ${courseNumber}`); }
    return times[courseNumber] || `Para ${courseNumber}?`;
  }

  private mapApiLessonType(apiType: string): ScheduleEntry['type'] {
    if (!apiType) {
      return 'N/A';
    }
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
    const mappedType = typeMap[upperApiType];
    if (!mappedType) {
      this.logger.warn(`❓ [mapApiLessonType] Unknown type: '${apiType}'.`);
      return (apiType as ScheduleEntry['type']) || 'N/A'; 
    }
    return mappedType as ScheduleEntry['type'];
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
    if (error.response) { this.logger.error(`❌ Axios error (${context}): ${error.response.status} ${error.response.statusText} - URL: ${error.config?.url} - Data: ${JSON.stringify(error.response.data)}`); }
    else if (error.request) { this.logger.error(`❌ Axios error (${context}): No response received. ${error.message} - URL: ${error.config?.url}`); }
    else { this.logger.error(`❌ Axios error (${context}): Request setup error. ${error.message}`); }
  }
}  
    