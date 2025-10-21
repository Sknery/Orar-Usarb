# Dockerfile для РАЗРАБОТКИ с hot-reload
# Старый Dockerfile был для production-сборки с Nginx. Этот - для разработки.

# Используем Node.js образ
FROM node:22-alpine

# Устанавливаем pnpm
RUN npm install -g pnpm

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY package.json pnpm-lock.yaml ./

# Устанавливаем все зависимости, включая dev-dependencies
RUN pnpm install --frozen-lockfile

# Копируем остальной код (эта часть будет "перекрыта" volume-ом из docker-compose,
# но она важна для первоначальной сборки образа)
COPY . .

# Открываем порт, на котором будет работать Vite
EXPOSE 5173

# Команда для запуска dev-сервера Vite, который будет следить за изменениями
CMD ["pnpm", "run", "dev"]
