import { Task, RecurrenceRule, TaskStatus } from '../types';
import { parseDateKey, addDays, getTodayKey } from './dateUtils';

// Check if a specific dateKey matches the recurrence rule
export function isDateMatchingRule(dateKey: string, rule: RecurrenceRule): boolean {
  if (rule.type === 'none') return false;

  // Before start date
  if (dateKey < rule.startDate) return false;

  // After end date if set
  if (rule.endDate && dateKey > rule.endDate) return false;

  if (rule.type === 'daily') {
    const interval = Math.max(1, rule.interval || 1);
    const start = parseDateKey(rule.startDate).getTime();
    const current = parseDateKey(dateKey).getTime();
    const diffDays = Math.round((current - start) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return false;
    return diffDays % interval === 0;
  }

  if (rule.type === 'weekdays') {
    const date = parseDateKey(dateKey);
    const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    return rule.daysOfWeek ? rule.daysOfWeek.includes(dayOfWeek) : false;
  }

  if (rule.type === 'yearly') {
    const [, startMonth, startDay] = rule.startDate.split('-').map(Number);
    const [, curMonth, curDay] = dateKey.split('-').map(Number);
    return startMonth === curMonth && startDay === curDay;
  }

  return false;
}

// Generate human-readable description of recurrence rule
export function getHumanRecurrenceLabel(rule?: RecurrenceRule): string {
  if (!rule || rule.type === 'none') return '';

  let base = '';
  if (rule.type === 'daily') {
    const interval = rule.interval || 1;
    if (interval === 1) base = 'Каждый день';
    else if (interval === 2) base = 'Через день';
    else if (interval === 3) base = 'Через 2 дня';
    else if (interval === 4) base = 'Через 3 дня';
    else base = `Каждые ${interval} дн.`;
  } else if (rule.type === 'weekdays') {
    const days = rule.daysOfWeek || [];
    const weekdaysOnly = [1, 2, 3, 4, 5];
    const weekendsOnly = [0, 6];

    if (days.length === 5 && weekdaysOnly.every(d => days.includes(d))) {
      base = 'По будням';
    } else if (days.length === 2 && weekendsOnly.every(d => days.includes(d))) {
      base = 'По выходным';
    } else {
      const dayNames: Record<number, string> = {
        1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 0: 'Вс'
      };
      // Sort in Mon-Sun order
      const sortedDays = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
      base = sortedDays.map(d => dayNames[d]).join(', ');
    }
  } else if (rule.type === 'yearly') {
    base = 'Каждый год';
  }

  if (rule.endDate) {
    const [y, m, d] = rule.endDate.split('-');
    base += ` (до ${d}.${m}.${y})`;
  }

  return base;
}

// Format short friendly date like "4 сен (Пт)"
export function formatShortDateWithWeekday(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const day = date.getDate();
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return `${day} ${months[date.getMonth()]} (${weekdays[date.getDay()]})`;
}

// Generate the next occurrences for preview
export function getUpcomingRecurrencePreview(
  startDateKey: string,
  rule: RecurrenceRule,
  maxCount: number = 4
): string[] {
  const results: string[] = [];
  for (let i = 0; i < 365 && results.length < maxCount; i++) {
    const d = addDays(startDateKey, i);
    if (isDateMatchingRule(d, rule)) {
      results.push(formatShortDateWithWeekday(d));
    }
  }
  return results;
}

// Ensure recurring tasks instances exist for dates around the current view
export function ensureRecurringTasks(
  tasks: Task[],
  rangeBefore: number = 7,
  rangeAfter: number = 45,
  deletedIds?: Record<string, string> | Set<string>
): { updatedTasks: Task[]; hasNewInstances: boolean } {
  const todayKey = getTodayKey();
  const parentTasks = tasks.filter(t => t.recurrence && t.recurrence.type !== 'none');

  if (parentTasks.length === 0) {
    return { updatedTasks: tasks, hasNewInstances: false };
  }

  const existingMap = new Map<string, Task>();
  for (const t of tasks) {
    const seriesId = t.recurrenceParentId || t.id;
    existingMap.set(`${seriesId}_${t.date}`, t);
  }

  const newInstances: Task[] = [];
  const nowIso = new Date().toISOString();

  for (const parent of parentTasks) {
    const rule = parent.recurrence!;

    // If parent itself was deleted, skip
    if (deletedIds) {
      const isParentDeleted = deletedIds instanceof Set
        ? deletedIds.has(parent.id)
        : Boolean(deletedIds[parent.id]);
      if (isParentDeleted) continue;
    }

    for (let i = -rangeBefore; i <= rangeAfter; i++) {
      const targetDateKey = addDays(todayKey, i);

      // Check if date matches recurrence rule
      if (isDateMatchingRule(targetDateKey, rule)) {
        const key = `${parent.id}_${targetDateKey}`;

        if (!existingMap.has(key)) {
          // If the target date is the parent task's own date, parent is already there
          if (parent.date === targetDateKey) {
            existingMap.set(key, parent);
            continue;
          }

          const instanceId = `rec-${parent.id}-${targetDateKey}`;

          // Check if this specific occurrence or parent was deleted
          if (deletedIds) {
            const isInstanceDeleted = deletedIds instanceof Set
              ? (deletedIds.has(instanceId) || deletedIds.has(parent.id))
              : Boolean(deletedIds[instanceId] || deletedIds[parent.id]);
            if (isInstanceDeleted) {
              continue;
            }
          }

          // Generate new instance
          const instance: Task = {
            id: instanceId,
            title: parent.title,
            notes: parent.notes,
            date: targetDateKey,
            status: targetDateKey < todayKey ? 'missed' : 'pending',
            createdAt: parent.createdAt,
            updatedAt: nowIso,
            recurrenceParentId: parent.id
          };

          newInstances.push(instance);
          existingMap.set(key, instance);
        }
      }
    }
  }

  if (newInstances.length > 0) {
    return {
      updatedTasks: [...tasks, ...newInstances],
      hasNewInstances: true
    };
  }

  return { updatedTasks: tasks, hasNewInstances: false };
}

// Smart Overdue Detection (as in LeaderTask):
// 1. One-off tasks from past days that are 'pending' are overdue.
// 2. For recurring tasks: if today ALREADY has a cycle episode, DO NOT accumulate debt or offer carry over.
// 3. If today does NOT have a cycle episode, offer only the most recent missed episode.
export function getEffectiveOverdueTasks(tasks: Task[], todayKey: string): Task[] {
  const pastPending = tasks.filter(t => t.date < todayKey && t.status === 'pending');
  if (pastPending.length === 0) return [];

  // Find all series that have a planned episode today
  const seriesActiveToday = new Set<string>();
  const todayTasks = tasks.filter(t => t.date === todayKey && t.status !== 'cancelled');

  for (const t of todayTasks) {
    if (t.recurrenceParentId) {
      seriesActiveToday.add(t.recurrenceParentId);
    }
    if (t.recurrence && t.recurrence.type !== 'none') {
      seriesActiveToday.add(t.id);
    }
  }

  const overdueList: Task[] = [];
  const recurringSeriesSeen = new Set<string>();

  // Sort past tasks descending so we see the most recent first
  const sortedPast = [...pastPending].sort((a, b) => b.date.localeCompare(a.date));

  for (const t of sortedPast) {
    const isRecurring = Boolean(t.recurrenceParentId || (t.recurrence && t.recurrence.type !== 'none'));

    if (!isRecurring) {
      // Regular tasks always count as overdue until resolved
      overdueList.push(t);
    } else {
      const seriesId = t.recurrenceParentId || t.id;

      // RULE: If this series already has an episode TODAY, do NOT offer previous past ones!
      if (seriesActiveToday.has(seriesId)) {
        continue;
      }

      // RULE: If today has no episode, only take the single most recent missed episode (not 10 backlog tasks)
      if (!recurringSeriesSeen.has(seriesId)) {
        recurringSeriesSeen.add(seriesId);
        overdueList.push(t);
      }
    }
  }

  return overdueList;
}

// Helper to embed recurrence rule into notes for transparent persistence (e.g. in 7-column Google Sheets)
export function attachRecurrenceToNotes(notes: string | undefined, rule: RecurrenceRule | undefined): string | undefined {
  const cleanNotes = (notes || '').replace(/\s*<!--rec:.*?-->/g, '').trim();
  if (!rule || rule.type === 'none') {
    return cleanNotes || undefined;
  }
  const tag = `<!--rec:${JSON.stringify(rule)}-->`;
  return cleanNotes ? `${cleanNotes}\n${tag}` : tag;
}

// Helper to extract recurrence rule from notes if available
export function extractRecurrenceFromNotes(notes: string | undefined): { cleanNotes: string | undefined; rule?: RecurrenceRule } {
  if (!notes) return { cleanNotes: undefined };
  const match = notes.match(/<!--rec:(.*?)-->/);
  let rule: RecurrenceRule | undefined = undefined;
  if (match && match[1]) {
    try {
      rule = JSON.parse(match[1]);
    } catch (e) {}
  }
  const clean = notes.replace(/\s*<!--rec:.*?-->/g, '').trim();
  return { cleanNotes: clean || undefined, rule };
}

// Check if a task is part of a recurring series (robust against missing props)
export function isRecurringTask(task: Task, allTasks: Task[] = []): boolean {
  if (!task) return false;
  if (task.recurrence && task.recurrence.type && task.recurrence.type !== 'none') return true;
  if (Boolean(task.recurrenceParentId)) return true;
  if (task.id.startsWith('rec-')) return true;
  if (task.notes && task.notes.includes('<!--rec:')) return true;
  if (allTasks && allTasks.length > 0) {
    if (allTasks.some(t => t.recurrenceParentId === task.id || t.id.startsWith(`rec-${task.id}-`))) {
      return true;
    }
  }
  return false;
}

// Auto-resolve past instances of a recurring series when today's episode is completed
export function completeTaskAndResolvePrevious(completedTask: Task, allTasks: Task[]): Task[] {
  const isRecurring = isRecurringTask(completedTask, allTasks);
  const now = new Date().toISOString();

  if (!isRecurring) {
    return allTasks.map(t =>
      t.id === completedTask.id ? { ...t, status: 'completed', updatedAt: now } : t
    );
  }

  const root = getSeriesRoot(completedTask, allTasks);
  const seriesId = root.id;

  return allTasks.map(t => {
    if (t.id === completedTask.id) {
      return { ...t, status: 'completed', updatedAt: now };
    }

    // If belongs to the same series, earlier than this task, and was still pending:
    // Mark as missed/resolved so user doesn't have to clean up past history!
    const matchesSeries = t.recurrenceParentId === seriesId || t.id === seriesId || t.id.startsWith(`rec-${seriesId}-`);
    if (matchesSeries && t.date < completedTask.date && t.status === 'pending') {
      return { ...t, status: 'missed', updatedAt: now };
    }

    return t;
  });
}

// Get the root parent task of a recurring series
export function getSeriesRoot(task: Task, allTasks: Task[]): Task {
  if (task.recurrenceParentId) {
    const parent = allTasks.find(t => t.id === task.recurrenceParentId);
    if (parent) return parent;
  }
  if (task.id.startsWith('rec-')) {
    const match = task.id.match(/^rec-(.+)-\d{4}-\d{2}-\d{2}$/);
    if (match) {
      const parentId = match[1];
      const parent = allTasks.find(t => t.id === parentId);
      if (parent) return parent;
    }
  }
  return task;
}

// Get effective recurrence rule for any task in a series
export function getSeriesRecurrenceRule(task: Task, allTasks: Task[]): RecurrenceRule | undefined {
  const root = getSeriesRoot(task, allTasks);
  if (root.recurrence && root.recurrence.type !== 'none') {
    return root.recurrence;
  }
  if (root.notes) {
    const { rule } = extractRecurrenceFromNotes(root.notes);
    if (rule && rule.type !== 'none') return rule;
  }
  return root.recurrence;
}

export interface UpdateTaskRecurrenceResult {
  updatedTasks: Task[];
  removedIds: string[];
}

// Update task title, notes and recurrence settings
export function updateTaskAndRecurrence(
  task: Task,
  newTitle: string,
  newNotes: string | undefined,
  newRule: RecurrenceRule | undefined,
  allTasks: Task[]
): UpdateTaskRecurrenceResult {
  const now = new Date().toISOString();
  const root = getSeriesRoot(task, allTasks);
  const wasRecurring = Boolean(root.recurrence && root.recurrence.type !== 'none');
  const isNowRecurring = Boolean(newRule && newRule.type !== 'none');

  // Case 1: Was not recurring, remains not recurring
  if (!wasRecurring && !isNowRecurring) {
    const updatedTasks = allTasks.map(t =>
      t.id === task.id ? { ...t, title: newTitle, notes: newNotes, updatedAt: now } : t
    );
    return { updatedTasks, removedIds: [] };
  }

  // Case 2: Was not recurring, converted to recurring
  if (!wasRecurring && isNowRecurring) {
    const updatedRoot: Task = {
      ...task,
      title: newTitle,
      notes: newNotes,
      recurrence: {
        ...newRule!,
        startDate: task.date
      },
      updatedAt: now
    };

    const updatedList = allTasks.map(t => (t.id === task.id ? updatedRoot : t));
    const { updatedTasks } = ensureRecurringTasks(updatedList, 7, 45);
    return { updatedTasks, removedIds: [] };
  }

  // Case 3: Was recurring, user turned recurrence OFF ('none')
  if (wasRecurring && !isNowRecurring) {
    const removedIds: string[] = [];
    const updatedTasks = allTasks
      .filter(t => {
        // Always preserve the current task being edited, even if it was a pending child instance
        if (t.id === task.id) return true;

        // Remove other child instances of this series that are still pending
        if ((t.recurrenceParentId === root.id || t.id.startsWith(`rec-${root.id}-`)) && t.status === 'pending') {
          removedIds.push(t.id);
          return false;
        }
        return true;
      })
      .map(t => {
        // If the task being edited was the root task
        if (t.id === root.id) {
          return {
            ...t,
            title: task.id === root.id ? newTitle : t.title,
            notes: task.id === root.id ? newNotes : t.notes,
            recurrence: undefined,
            updatedAt: now
          };
        }
        // If the task being edited is a child instance: detach it and make it a standalone one-time task
        if (t.id === task.id && task.id !== root.id) {
          return {
            ...t,
            title: newTitle,
            notes: newNotes,
            recurrenceParentId: undefined,
            recurrence: undefined,
            updatedAt: now
          };
        }
        return t;
      });

    return { updatedTasks, removedIds };
  }

  // Case 4: Was recurring, user modified recurrence rules (interval, days, dates, etc.)
  if (wasRecurring && isNowRecurring) {
    const updatedRule: RecurrenceRule = {
      ...newRule!,
      startDate: root.recurrence?.startDate || root.date
    };

    // 1. Remove all uncompleted child instances from today onwards so they get cleanly regenerated
    const filteredTasks = allTasks.filter(t => {
      if (t.recurrenceParentId === root.id && t.status === 'pending') {
        return false;
      }
      return true;
    });

    // 2. Update root task with new rule and title/notes
    const updatedTasksWithRoot = filteredTasks.map(t => {
      if (t.id === root.id) {
        return {
          ...t,
          title: newTitle,
          notes: newNotes,
          recurrence: updatedRule,
          updatedAt: now
        };
      }
      // If task being edited is a child instance that was completed, update its title/notes
      if (t.id === task.id) {
        return {
          ...t,
          title: newTitle,
          notes: newNotes,
          updatedAt: now
        };
      }
      return t;
    });

    // 3. Regenerate future instances according to the new schedule
    const { updatedTasks } = ensureRecurringTasks(updatedTasksWithRoot, 7, 45);
    return { updatedTasks, removedIds: [] };
  }

  return { updatedTasks: allTasks, removedIds: [] };
}

// Stop recurring cycle from a given date onwards (preserves past history)
export function stopSeriesFromDate(task: Task, fromDateKey: string, allTasks: Task[]): Task[] {
  const root = getSeriesRoot(task, allTasks);
  if (!root.recurrence) return allTasks;

  const now = new Date().toISOString();
  const stopDate = addDays(fromDateKey, -1);

  // If stopped on or before start date, cancel recurrence completely
  if (stopDate < (root.recurrence.startDate || root.date)) {
    return allTasks
      .filter(t => t.recurrenceParentId !== root.id)
      .map(t => {
        if (t.id === root.id) {
          return { ...t, recurrence: undefined, updatedAt: now };
        }
        return t;
      });
  }

  const updatedRule: RecurrenceRule = {
    ...root.recurrence,
    endDate: stopDate
  };

  return allTasks
    .filter(t => {
      // Remove future pending child instances on or after fromDateKey
      if (t.recurrenceParentId === root.id && t.date >= fromDateKey && t.status === 'pending') {
        return false;
      }
      return true;
    })
    .map(t => {
      if (t.id === root.id) {
        if (t.date >= fromDateKey && t.status === 'pending') {
          return { ...t, recurrence: updatedRule, status: 'cancelled' as TaskStatus, updatedAt: now };
        }
        return { ...t, recurrence: updatedRule, updatedAt: now };
      }
      return t;
    });
}

export interface DeleteSeriesResult {
  updatedTasks: Task[];
  deletedIds: string[];
}

// Delete recurring task with options: single instance, stop future cycle, or delete entire series
export function deleteSeriesWithOptions(
  task: Task,
  mode: 'single' | 'future' | 'all',
  allTasks: Task[]
): DeleteSeriesResult {
  const root = getSeriesRoot(task, allTasks);
  const rootId = root.id;

  if (mode === 'single') {
    // If deleting the root task instance on its own date, we must preserve the recurrence rule!
    if (task.id === rootId && root.recurrence && root.recurrence.type !== 'none') {
      let nextDate = '';
      for (let i = 1; i <= 365; i++) {
        const candidate = addDays(task.date, i);
        if (isDateMatchingRule(candidate, root.recurrence)) {
          nextDate = candidate;
          break;
        }
      }

      if (nextDate) {
        const now = new Date().toISOString();
        const updatedRule: RecurrenceRule = {
          ...root.recurrence,
          startDate: nextDate
        };
        const updatedTasks = allTasks
          .filter(t => t.id !== `rec-${rootId}-${nextDate}`)
          .map(t => {
            if (t.id === rootId) {
              return {
                ...t,
                date: nextDate,
                recurrence: updatedRule,
                updatedAt: now
              };
            }
            return t;
          });

        return {
          updatedTasks,
          deletedIds: [task.id, `rec-${rootId}-${task.date}`]
        };
      }
    }

    // Normal single child instance deletion
    const tombstoneKey = `rec-${rootId}-${task.date}`;
    return {
      updatedTasks: allTasks.filter(t => t.id !== task.id),
      deletedIds: [task.id, tombstoneKey]
    };
  }

  if (mode === 'future') {
    // Stop series from task.date, and delete task if pending
    const stopped = stopSeriesFromDate(task, task.date, allTasks);
    const deletedIds: string[] = [];
    for (const t of allTasks) {
      const isChild = t.recurrenceParentId === rootId || t.id.startsWith(`rec-${rootId}-`);
      if (isChild && t.date >= task.date) {
        deletedIds.push(t.id);
      }
    }
    deletedIds.push(task.id);
    return {
      updatedTasks: stopped.filter(t => t.id !== task.id),
      deletedIds: Array.from(new Set(deletedIds))
    };
  }

  if (mode === 'all') {
    // Delete root and ALL child instances everywhere
    const deletedIds: string[] = [];
    const updatedTasks = allTasks.filter(t => {
      const isRoot = t.id === rootId;
      const isChild = t.recurrenceParentId === rootId || t.id.startsWith(`rec-${rootId}-`);
      if (isRoot || isChild) {
        deletedIds.push(t.id);
        return false;
      }
      return true;
    });

    return {
      updatedTasks,
      deletedIds: Array.from(new Set(deletedIds))
    };
  }

  return {
    updatedTasks: allTasks,
    deletedIds: []
  };
}

