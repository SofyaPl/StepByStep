export type TaskStatus = 'pending' | 'completed' | 'cancelled' | 'missed';

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'yearly';

export interface RecurrenceRule {
  type: RecurrenceType;
  interval?: number; // 1 = каждый день, 2 = через день, 3 = каждые 3 дня...
  daysOfWeek?: number[]; // [1, 2, 3, 4, 5, 6, 0] где 0 = вс, 1 = пн, 2 = вт...
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (опциональное ограничение срока)
}

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  status: TaskStatus;
  notes?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  recurrence?: RecurrenceRule; // Настройки повторения для родительской задачи
  recurrenceParentId?: string; // Ссылка на родительскую задачу для экземпляров цикла
}

export type DayFilter = 'all' | 'pending' | 'completed' | 'cancelled';

export interface SyncSettings {
  googleSheetsUrl: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
}

export interface SyncResult {
  success: boolean;
  message?: string;
  count?: number;
}
