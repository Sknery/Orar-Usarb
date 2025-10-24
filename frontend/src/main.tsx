import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// --- ИЗМЕНЕНИЕ: Глобальная настройка date-fns ---
import { setDefaultOptions } from 'date-fns'
import { ro } from 'date-fns/locale'

// Устанавливаем румынскую локаль (которая начинает неделю с Понедельника)
// как стандартную для ВСЕГО приложения.
// --- ИЗМЕНЕНИЕ: Добавляем weekStartsOn: 1 ПРИНУДИТЕЛЬНО ---
// Это должно железно исправить "воскресенье" на системном уровне.
setDefaultOptions({ locale: ro, weekStartsOn: 1 })
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

