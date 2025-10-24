import { ro } from 'date-fns/locale';
import type { Locale } from 'date-fns';

/**
 * Глобальные опции для date-fns, которые гарантируют,
 * что неделя начинается с Понедельника.
 * * locale: ro - Румынская локаль (Luni - первый день).
 * weekStartsOn: 1 - Явное указание, что Понедельник = 1.
 */
export const RO_WEEK_OPTIONS: { locale: Locale; weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 } = {
  locale: ro,
  weekStartsOn: 1
};

