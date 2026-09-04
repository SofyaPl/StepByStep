import { Task, SyncSettings } from '../types';
import { getTodayKey, addDays } from '../utils/dateUtils';

const STORAGE_KEY_TASKS = 'step_by_step_tasks_v1';
const STORAGE_KEY_SETTINGS = 'step_by_step_settings_v1';
const STORAGE_KEY_DELETED = 'step_by_step_deleted_ids_v1';

export function loadDeletedTaskIds(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // Keep entries up to 30 days
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const cleaned: Record<string, string> = {};
        for (const [id, dateStr] of Object.entries(parsed)) {
          if (typeof dateStr === 'string' && new Date(dateStr).getTime() >= thirtyDaysAgo) {
            cleaned[id] = dateStr;
          }
        }
        return cleaned;
      }
    }
  } catch (e) {
    console.error('Failed to load deletedTaskIds from localStorage', e);
  }
  return {};
}

export function saveDeletedTaskIds(map: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save deletedTaskIds', e);
  }
}

export function recordDeletedTaskIds(ids: string[]): Record<string, string> {
  const validIds = ids.filter(Boolean);
  if (validIds.length === 0) return loadDeletedTaskIds();
  const current = loadDeletedTaskIds();
  const now = new Date().toISOString();
  for (const id of validIds) {
    current[id] = now;
  }
  saveDeletedTaskIds(current);
  return current;
}

export function isTaskIdDeleted(id: string): boolean {
  if (!id) return false;
  const current = loadDeletedTaskIds();
  return Boolean(current[id]);
}

export function clearDeletedTaskIds(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_DELETED);
  } catch (e) {
    console.error('Failed to clear deletedTaskIds', e);
  }
}

export function getInitialDemoTasks(): Task[] {
  const today = getTodayKey();
  const tomorrow = addDays(today, 1);
  const now = new Date().toISOString();

  return [
    {
      id: 'demo-1',
      title: 'Установить приложение на телефон через меню браузера',
      date: today,
      status: 'pending',
      notes: 'Нажмите в браузере «Поделиться» → «На экран Домой»',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'demo-2',
      title: 'Проверить перенос задачи на другой день',
      date: today,
      status: 'pending',
      notes: 'Нажмите на иконку календарика или кнопку «На завтра»',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'demo-3',
      title: 'Начать пользоваться собственным ежедневником',
      date: today,
      status: 'completed',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'demo-4',
      title: 'Запланированная задача на завтра',
      date: tomorrow,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    }
  ];
}

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (!raw) {
      const initial = getInitialDemoTasks();
      saveTasks(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Failed to load tasks from localStorage', e);
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks to localStorage', e);
  }
}

export function loadSettings(): SyncSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load settings', e);
  }
  return {
    googleSheetsUrl: '',
    autoSync: false,
    lastSyncedAt: null
  };
}

export function saveSettings(settings: SyncSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function exportBackupJson(tasks: Task[]): string {
  return JSON.stringify(tasks, null, 2);
}

export function importBackupJson(jsonString: string): Task[] | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      // Validate minimal structure
      const validTasks: Task[] = parsed.filter(t => t && t.id && t.title && t.date && t.status);
      saveTasks(validTasks);
      return validTasks;
    }
  } catch (e) {
    console.error('Import error', e);
  }
  return null;
}
