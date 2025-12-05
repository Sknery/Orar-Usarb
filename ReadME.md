# 📘 Orar USARB — Production Deployment Guide

Многоконтейнерное приложение (Frontend Nginx, Backend NestJS, PostgreSQL)
Домен: **orar.usarb.md**
Функционал: HTTPS, Nginx reverse-proxy, интеграция Google Calendar

---

## 📍 1. DNS Настройка

1. Настройте **A-запись** домена `orar.usarb.md` на IP вашего продакшн-сервера.
2. Клонируйте репозиторий:

```bash
git clone <URL> Orar-Usarb
cd Orar-Usarb
```

---

## 🔐 2. Google Cloud OAuth Setup

1. Перейдите в **Google Cloud Console**
2. Создайте или выберите проект
3. Включите **Google Calendar API**
4. Создайте **OAuth2 Client ID (Web Application)**
5. В redirect URIs добавьте:

```
https://orar.usarb.md/google-calendar/oauth-callback
```

6. Получите **Client ID** и **Client Secret**
   (понадобятся в `.env`)

---

## 🧩 3. Файл `.env`

Создайте `~/Orar-Usarb/.env`:

```
# --- PostgreSQL ---
DB_PORT=5432
DB_USERNAME=usarb_user
DB_PASSWORD=<СЛОЖНЫЙ_ПАРОЛЬ>
DB_DATABASE=orar_db

# --- Google OAuth ---
GOOGLE_CLIENT_ID=<Ваш Google Client ID>
GOOGLE_CLIENT_SECRET=<Ваш Google Client Secret>
GOOGLE_CALLBACK_URL=https://orar.usarb.md/google-calendar/oauth-callback

# --- Domain ---
FRONTEND_URL=https://orar.usarb.md

# --- Ports ---
FRONTEND_PORT=8080
API_PORT=3000
```

---

## 🔧 4. Nginx (Host) Конфигурация

Хостовый Nginx отвечает за:

* HTTP → HTTPS redirect
* reverse proxy на фронтенд, работающий в docker на `127.0.0.1:8080`

Файл `/etc/nginx/sites-available/orar.usarb.md`:

```nginx
server {
    server_name orar.usarb.md;

    location / {
        proxy_pass http://127.0.0.1:8080;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/orar.usarb.md/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/orar.usarb.md/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = orar.usarb.md) {
        return 301 https://$host$request_uri;
    }

    server_name orar.usarb.md;
    listen 80;
    return 404;
}
```

Проверка:

```bash
nginx -t
systemctl reload nginx
```

---

## 🐳 5. Docker Compose — Build & Deploy

### 5.1. Убедитесь, что в `frontend/nginx.prod.conf` стоит слэш:

```nginx
location /api/ {
    proxy_pass http://schedule-api-prod:3000/;
}
```

### 5.2. Сборка и запуск

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

Статус должен показывать `Up` и `healthy`.

---

## 🧪 6. Финальная проверка

### ✔ Доступность сайта

Откройте:
**[https://orar.usarb.md](https://orar.usarb.md)**

### ✔ Проверка API

Расписание должно загружаться корректно.

### ✔ Google Calendar OAuth

Нажмите "Conectare Google Calendar":

* должен быть редирект на Google логин
* затем возврат на [https://orar.usarb.md](https://orar.usarb.md)
* и успешная привязка календаря

### ✔ Логи backend (если нужно)

```bash
docker compose -f docker-compose.prod.yml logs schedule-api-prod
```

