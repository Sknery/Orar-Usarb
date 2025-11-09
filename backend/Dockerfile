# Этап 1: "Строитель" (Builder) - для сборки приложения
FROM node:22-slim AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# ---
# Этап 2: "Продакшен/Разработка" - для запуска
FROM node:22-slim

# --- ИСПРАВЛЕНИЕ: Устанавливаем 'procps' (для команды 'ps') ---
# 'nest start --watch' использует 'ps' для управления дочерними процессами,
# а 'procps' не включен в 'node:22-slim' по умолчанию.
RUN apt-get update && apt-get install -y procps && rm -rf /var/lib/apt/lists/*
# --- КОНЕЦ ИСПРАВЛЕНИЯ ---

WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
# ИЗМЕНЕНИЕ: Устанавливаем ВСЕ зависимости (включая dev), 
# чтобы были доступны инструменты для режима разработки (например, для команды start:dev)
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY --from=builder /app/dist ./dist

EXPOSE 3000
# Команда для production-запуска.
# Для разработки она будет переопределена в docker-compose.yml
CMD ["node", "dist/src/main.js"]