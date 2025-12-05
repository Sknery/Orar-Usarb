📝 Руководство по Продакшн-Деплою (orar.usarb.md)Цель: Запуск многоконтейнерного приложения (Frontend Nginx, Backend NestJS, PostgreSQL) на домене orar.usarb.md с использованием SSL и интеграции Google Calendar.Среда: Сервер с установленным Docker, Docker Compose и активным HTTPS (Certbot).1. Подготовка и Настройка DNS1.1. Настройка DNSУбедитесь, что для домена orar.usarb.md в панели управления DNS вашего университета настроена A-запись, указывающая на IP-адрес вашего продакшн-сервера.1.2. Клонирование репозитория и переходgit clone <URL вашего репозитория> Orar-Usarb
cd Orar-Usarb
2. Настройка Google Cloud (OAuth)Для работы синхронизации с Google Calendar необходимо настроить клиент OAuth 2.0.Перейдите в Google Cloud Console.Создайте проект или используйте существующий.Включите API: Google Calendar API.Создайте учетные данные (Credentials) типа OAuth 2.0 Client ID.Тип приложения: Веб-приложение.Авторизованные URI перенаправления (Authorized redirect URIs):Добавьте ТОЧНЫЙ адрес, который будет использовать бэкенд:[https://orar.usarb.md/google-calendar/oauth-callback](https://orar.usarb.md/google-calendar/oauth-callback)
Полученные Client ID и Client Secret будут использоваться на следующем шаге.3. Создание файла .envВ корневой директории проекта (~/Orar-Usarb/) создайте и заполните файл .env (он используется файлом docker-compose.prod.yml).3.1. Структура .env# --- Настройки PostgreSQL ---
DB_PORT=5432
DB_USERNAME=usarb_user      ; Можете использовать свое имя пользователя
DB_PASSWORD=<СЛОЖНЫЙ_ПАРОЛЬ> ; Обязательно смените!
DB_DATABASE=orar_db

# --- Настройки Google Calendar (КРИТИЧНО) ---
# Получены из Google Cloud Console
GOOGLE_CLIENT_ID=<Ваш Google Client ID>
GOOGLE_CLIENT_SECRET=<Ваш Google Client Secret>
# Callback URL должен ТОЧНО совпадать с тем, что вы указали в Google Cloud
GOOGLE_CALLBACK_URL=[https://orar.usarb.md/google-calendar/oauth-callback](https://orar.usarb.md/google-calendar/oauth-callback)

# --- Настройки Домена ---
# URL, который используется фронтендом для редиректов. 
FRONTEND_URL=[https://orar.usarb.md](https://orar.usarb.md)

# --- Порты ---
# Внешние порты. 8080 для фронтенда, 3000 для бэкенда (хотя бэкенд не должен быть открыт)
FRONTEND_PORT=8080
API_PORT=3000 
4. Настройка Host Nginx (SSL и Проксирование)Ваш системный Nginx (nginx/1.24.0 (Ubuntu)) должен выполнять две задачи:Перенаправлять HTTP (порт 80) на HTTPS (порт 443).Проксировать весь HTTPS-трафик на Docker-контейнер фронтенда, который слушает порт 8080.Отредактируйте файл конфигурации вашего сайта (предположительно /etc/nginx/sites-available/orar.usarb.md или usarb-schedule).4.1. Исправленный конфигурационный файл NginxУбедитесь, что конфигурация выглядит следующим образом. Ключевой момент: блок location / в HTTPS-части должен проксировать на 127.0.0.1:8080.server {
    server_name orar.usarb.md;

    location / {
        # *** ЭТО КРИТИЧЕСКАЯ ИСПРАВЛЕННАЯ СТРОКА ***
        # Весь трафик идет на фронтенд Nginx, который слушает порт 8080 на хосте
        proxy_pass [http://127.0.0.1:8080](http://127.0.0.1:8080);
        
        # Стандартные заголовки для корректной работы прокси
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Сертификаты, управляемые Certbot (оставляем, как есть)
    listen 443 ssl; 
    ssl_certificate /etc/letsencrypt/live/orar.usarb.md/fullchain.pem; 
    ssl_certificate_key /etc/letsencrypt/live/orar.usarb.md/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf; 
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; 
}

# --- Блок перенаправления HTTP на HTTPS ---
server {
    if ($host = orar.usarb.md) {
        return 301 https://$host$request_uri;
    } 
    server_name orar.usarb.md;
    listen 80;
    return 404; # Если Certbot не управлял этим блоком, здесь может быть return 301.
}
4.2. Применение изменений NginxПроверьте синтаксис: nginx -tПерезагрузите Nginx: systemctl reload nginx5. Обновление и Запуск Docker ComposeПосле подготовки окружения и Nginx можно разворачивать приложение.5.1. Обновление внутреннего Nginx (Frontend)Мы уже внесли правку в frontend/nginx.prod.conf (добавили слэш в конце proxy_pass):# В файле frontend/nginx.prod.conf
# ...
location /api/ {
    # СЛЭШ В КОНЦЕ УДАЛЯЕТ /api/ ИЗ ПУТИ ДЛЯ БЭКЕНДА
    proxy_pass http://schedule-api-prod:3000/; 
    # ...
}
5.2. Сборка и ЗапускВыполните следующие команды в корневой директории проекта (~/Orar-Usarb/):Сборка образов:docker compose -f docker-compose.prod.yml build
(Это соберет Frontend, Backend и подготовит их к продакшн-запуску)Запуск контейнеров:docker compose -f docker-compose.prod.yml up -d
Проверка статуса:docker compose -f docker-compose.prod.yml ps
(Все сервисы должны быть в статусе Up и БД должна быть (healthy))6. Финальная ПроверкаПроверка доступности (внешняя): Откройте https://orar.usarb.md в браузере. Вы должны увидеть интерфейс приложения.Проверка API (внешняя): Приложение должно успешно загрузить расписание.Проверка Google Calendar: Нажмите кнопку "Conectare Google Calendar". Должен произойти редирект на страницу авторизации Google, а затем обратно на https://orar.usarb.md/. Если редирект работает, интеграция настроена верно.Проверка логов бэкенда (при проблемах):docker compose -f docker-compose.prod.yml logs schedule-api-prod
