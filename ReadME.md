
# Инструкция по развертыванию (Production)

Этот документ описывает, как развернуть проект на рабочем (production) сервере с использованием Docker.

## 1. Предварительные требования

На сервере, куда будет производиться развертывание, должны быть установлены:

* `git` (для получения кода)
* `docker`
* `docker-compose`

## 2. Подготовка проекта

**Шаг 1. Клонирование репозитория**

Подключитесь к вашему серверу (например, по SSH) и выполните:

```bash
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ>
cd <ПАПКА_ПРОЕКТА>
````

**Шаг 2. Создание файлов конфигурации**

Вам нужно добавить в проект 4 новых файла (их содержимое уже предоставлено):

1.  `docker-compose.prod.yml` (в корень проекта)
2.  `backend/Dockerfile.prod` (в папку `backend`)
3.  `frontend/Dockerfile.prod` (в папку `frontend`)
4.  **`frontend/nginx.prod.conf`** (в папку `frontend`)

**Шаг 3. Создание файла переменных окружения (`.env`)**

В корне проекта создайте файл с именем `.env`. `docker-compose` автоматически прочтет его.

Скопируйте в него это содержимое и **обязательно** замените пароли и ключи:

```bash
# .env

# --- Настройки Базы Данных ---
# Имя хоста должно совпадать с именем сервиса в docker-compose.prod.yml
DB_HOST=schedule-db-prod 
DB_PORT=5432
DB_USERNAME=schedule_user
DB_PASSWORD=mysecretpassword123 # <--- ОБЯЗАТЕЛЬНО ЗАМЕНИТЕ НА СЛОЖНЫЙ ПАРОЛЬ
DB_DATABASE=schedule_db

# --- Настройки API (Бэкенд) ---
API_PORT=3000

# --- Ключи Google API ---
GOOGLE_CLIENT_ID=ВАШ_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=ВАШ_GOOGLE_CLIENT_SECRET

# --- Настройки домена ---
# URL, который вы добавили в Google Cloud Console
# Он ДОЛЖЕН указывать на бэкенд (порт 3000)
GOOGLE_REDIRECT_URI=[http://orar.usarb.md:3000/google-calendar/oauth-callback](http://orar.usarb.md:3000/google-calendar/oauth-callback)

# URL, на который пользователь вернется после входа в Google
# Он ДОЛЖЕН указывать на фронтенд (порт 8080)
FRONTEND_URL=[http://orar.usarb.md:8080](http://orar.usarb.md:8080)

# ---------------------------------------------------------------------------
# ВАЖНО: В Google Cloud Console ([https://console.cloud.google.com/](https://console.cloud.google.com/))
# вам нужно будет добавить НОВЫЙ "Authorized redirect URI"
# для вашего production-сервера.
#
# Он должен выглядеть так:
# [http://orar.usarb.md:3000/google-calendar/oauth-callback](http://orar.usarb.md:3000/google-calendar/oauth-callback)
# ---------------------------------------------------------------------------
```

**Шаг 4. Настройка домена в Nginx (Важно\!)**

Убедитесь, что в файле **`frontend/nginx.prod.conf`** указано правильное имя домена:

```nginx
# ...
server_name orar.usarb.md;
# ...
```

## 3\. Запуск

Теперь, когда все файлы на месте, вы можете собрать и запустить проект.

**Шаг 1. Сборка (Build)**

Эта команда соберет ваши production-образы. Это может занять 5-10 минут в первый раз.

```bash
docker-compose -f docker-compose.prod.yml build
```

**Шаг 2. Запуск (Run)**

Эта команда запустит все контейнеры в фоновом режиме (`-d`).

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 4\. Доступ

После успешного запуска:

  * **Фронтенд (сайт):** `http://orar.usarb.md:8080`
  * **Бэкенд (API):** `http://orar.usarb.md:3000`

(Предполагается, что порт `8080` открыт на сервере. Для использования стандартного порта `80` потребуется настроить `docker-compose.prod.yml` и, возможно, запускать Docker с правами `sudo`).

## 5\. Управление

  * **Посмотреть логи (журнал работы):**

    ```bash
    docker-compose -f docker-compose.prod.yml logs -f
    ```

  * **Остановить приложение:**

    ```bash
    docker-compose -f docker-compose.prod.yml down
    ```

  * **Обновить приложение (после `git pull`):**

    ```bash
    docker-compose -f docker-compose.prod.yml build
    docker-compose -f docker-compose.prod.yml up -d
    ```

<!-- end list -->

```
```