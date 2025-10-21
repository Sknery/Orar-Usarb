import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0', 
    port: 5173,
    watch: {
      usePolling: true,
    },
    // ИЗМЕНЕНИЕ: Добавляем прокси для перенаправления API-запросов на бэкенд
    proxy: {
      // Все запросы, начинающиеся с /api, будут перенаправлены
      '/api': {
        // Указываем адрес бэкенд-сервиса, как он назван в docker-compose.yml
        target: 'http://schedule-api:3000',
        // Необходимо для правильной работы прокси
        changeOrigin: true,
        // Убираем /api из пути, так как NestJS не ожидает его
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})

