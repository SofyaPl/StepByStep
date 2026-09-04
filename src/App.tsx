import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Task, TaskStatus, DayFilter, SyncSettings, RecurrenceRule } from './types';
import {
  loadTasks,
  saveTasks,
  loadSettings,
  saveSettings,
  loadDeletedTaskIds,
  saveDeletedTaskIds,
  recordDeletedTaskIds,
  clearDeletedTaskIds
} from './services/storage';
import {
  getDeferredInstallPrompt,
  promptPwaInstall,
  isAppStandalone
} from './serviceWorkerHelper';
import { syncWithGoogleSheets } from './services/googleSheets';
import { getTodayKey } from './utils/dateUtils';
import {
  ensureRecurringTasks,
  getEffectiveOverdueTasks,
  completeTaskAndResolvePrevious,
  getHumanRecurrenceLabel,
  getSeriesRecurrenceRule,
  getSeriesRoot,
  isRecurringTask,
  updateTaskAndRecurrence,
  stopSeriesFromDate,
  deleteSeriesWithOptions
} from './utils/recurrenceUtils';
import { Header } from './components/Header';
import { DateStrip } from './components/DateStrip';
import { StatsBar } from './components/StatsBar';
import { OverdueAlert } from './components/OverdueAlert';
import { TaskCard } from './components/TaskCard';
import { NewTaskModal } from './components/NewTaskModal';
import { EditTaskModal } from './components/EditTaskModal';
import { DeleteRecurringModal } from './components/DeleteRecurringModal';
import { DatePickerModal } from './components/DatePickerModal';
import { SettingsModal } from './components/SettingsModal';
import { Inbox, Plus } from 'lucide-react';

export const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getTodayKey());
  const [activeFilter, setActiveFilter] = useState<DayFilter>('all');
  const [settings, setSettings] = useState<SyncSettings>(loadSettings());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // PWA Install on Desktop & Mobile
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    setIsStandalone(isAppStandalone());
    if (getDeferredInstallPrompt()) {
      setCanInstall(true);
    }

    const handleInstallable = () => setCanInstall(true);
    const handleInstalled = () => {
      setCanInstall(false);
      setIsStandalone(true);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);
    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    const success = await promptPwaInstall();
    if (success) {
      setCanInstall(false);
      setIsStandalone(true);
    }
  };

  // Modals
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reschedulingTask, setReschedulingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingRecurringTask, setDeletingRecurringTask] = useState<Task | null>(null);

  // Keep tasksRef in sync
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Helper to update tasks and track removed task IDs persistently
  const isSyncingRef = useRef<boolean>(false);
  const pendingChangesDuringSyncRef = useRef<boolean>(false);
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSyncRef = useRef<(fullReload?: boolean) => Promise<void>>(() => Promise.resolve());

  // Debounced auto-sync trigger: only called when USER makes changes
  const triggerAutoSync = useCallback(() => {
    const curSettings = loadSettings();
    if (!curSettings.autoSync || !curSettings.googleSheetsUrl) {
      return;
    }

    if (isSyncingRef.current) {
      pendingChangesDuringSyncRef.current = true;
      return;
    }

    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
    }

    autoSyncTimerRef.current = setTimeout(() => {
      handleSyncRef.current(false);
    }, 3000); // 3 seconds after user stops making changes
  }, []);

  const updateTasks = useCallback((newTasks: Task[], extraDeletedIds?: string[], shouldAutoSync: boolean = true) => {
    const newIds = new Set(newTasks.map(t => t.id));
    const removedIds: string[] = [];
    for (const t of tasksRef.current) {
      if (!newIds.has(t.id)) {
        removedIds.push(t.id);
      }
    }
    if (extraDeletedIds) {
      for (const id of extraDeletedIds) {
        if (!newIds.has(id)) removedIds.push(id);
      }
    }
    if (removedIds.length > 0) {
      recordDeletedTaskIds(removedIds);
    }
    saveTasks(newTasks);
    tasksRef.current = newTasks;
    setTasks(newTasks);

    if (isSyncingRef.current) {
      pendingChangesDuringSyncRef.current = true;
    } else if (shouldAutoSync) {
      triggerAutoSync();
    }
  }, [triggerAutoSync]);

  // Apply tasks from sync (without scheduling auto-sync back)
  const applySyncedTasks = useCallback((syncedTasks: Task[], newDeletedMap: Record<string, string>) => {
    tasksRef.current = syncedTasks;
    setTasks(syncedTasks);
    saveTasks(syncedTasks);
    saveDeletedTaskIds(newDeletedMap);
  }, []);

  // Load initial tasks & ensure recurring instances are present
  useEffect(() => {
    const loaded = loadTasks();
    const deleted = loadDeletedTaskIds();
    const { updatedTasks, hasNewInstances } = ensureRecurringTasks(loaded, 7, 45, deleted);
    tasksRef.current = updatedTasks;
    setTasks(updatedTasks);
    if (hasNewInstances) {
      saveTasks(updatedTasks);
    }

    // Auto-sync on startup if Google Sheets URL is configured
    const savedSettings = loadSettings();
    if (savedSettings.googleSheetsUrl) {
      const isOnlyDemo = loaded.length > 0 && loaded.every(t => t.id.startsWith('demo-'));
      if (isOnlyDemo || loaded.length === 0) {
        clearDeletedTaskIds();
        handleSyncRef.current(true);
      } else {
        handleSyncRef.current(false);
      }
    }
  }, [applySyncedTasks]);

  // Sync when returning to the app window/tab
  useEffect(() => {
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        const cur = loadSettings();
        if (cur.googleSheetsUrl && cur.autoSync) {
          handleSyncRef.current(false);
        }
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);
    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, []);

  // Whenever selectedDateKey changes, ensure recurring instances are generated around it
  useEffect(() => {
    if (tasks.length > 0) {
      const deleted = loadDeletedTaskIds();
      const { updatedTasks, hasNewInstances } = ensureRecurringTasks(tasks, 7, 45, deleted);
      if (hasNewInstances) {
        tasksRef.current = updatedTasks;
        setTasks(updatedTasks);
        saveTasks(updatedTasks);
      }
    }
  }, [selectedDateKey, tasks.length]);

  // Add Task with optional recurrence
  const handleAddTask = (title: string, notes?: string, recurrence?: RecurrenceRule) => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      title,
      notes,
      date: selectedDateKey,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      recurrence
    };

    const combined = [newTask, ...tasks];
    const { updatedTasks } = ensureRecurringTasks(combined, 7, 45);
    updateTasks(updatedTasks);
  };

  // Status Change (with smart resolving of prior cycle instances when completed)
  const handleStatusChange = (id: string, status: TaskStatus) => {
    const targetTask = tasks.find(t => t.id === id);
    if (!targetTask) return;

    if (status === 'completed') {
      const updated = completeTaskAndResolvePrevious(targetTask, tasks);
      updateTasks(updated);
    } else {
      const now = new Date().toISOString();
      const updated = tasks.map(t =>
        t.id === id ? { ...t, status, updatedAt: now } : t
      );
      updateTasks(updated);
    }
  };

  // Move task to a new date
  const handleMoveDate = (id: string, newDate: string) => {
    const now = new Date().toISOString();
    const updated = tasks.map(t =>
      t.id === id ? { ...t, date: newDate, updatedAt: now } : t
    );
    updateTasks(updated);
  };

  // Delete Task initiator (shows 3-way modal if recurring, or deletes immediately if single)
  const handleStartDeleteTask = (task: Task) => {
    if (isRecurringTask(task, tasksRef.current)) {
      setDeletingRecurringTask(task);
    } else {
      recordDeletedTaskIds([task.id]);
      const updated = tasksRef.current.filter(t => t.id !== task.id);
      updateTasks(updated, [task.id]);
    }
  };

  // Confirm delete of recurring task with chosen mode
  const handleConfirmDeleteRecurring = (task: Task, mode: 'single' | 'future' | 'all') => {
    const { updatedTasks, deletedIds } = deleteSeriesWithOptions(task, mode, tasksRef.current);
    recordDeletedTaskIds(deletedIds);
    updateTasks(updatedTasks, deletedIds);
    setDeletingRecurringTask(null);
  };

  // Stop recurring series from this date onwards (preserves past history)
  const handleStopSeries = (task: Task) => {
    const root = getSeriesRoot(task, tasksRef.current);
    const updated = stopSeriesFromDate(task, task.date, tasksRef.current);
    const removedIds: string[] = [];
    for (const t of tasksRef.current) {
      if ((t.recurrenceParentId === root.id || t.id.startsWith(`rec-${root.id}-`)) && t.date >= task.date && t.status === 'pending') {
        removedIds.push(t.id);
      }
    }
    recordDeletedTaskIds(removedIds);
    updateTasks(updated, removedIds);
    setEditingTask(null);
  };

  // Save changes from Edit Task Modal
  const handleSaveEditedTask = (task: Task, title: string, notes?: string, recurrence?: RecurrenceRule) => {
    const { updatedTasks, removedIds } = updateTaskAndRecurrence(task, title, notes, recurrence, tasksRef.current);
    if (removedIds && removedIds.length > 0) {
      recordDeletedTaskIds(removedIds);
      updateTasks(updatedTasks, removedIds);
    } else {
      updateTasks(updatedTasks);
    }
    setEditingTask(null);
  };

  // Smart Overdue Tasks
  const overdueTasks = useMemo(() => {
    return getEffectiveOverdueTasks(tasks, getTodayKey());
  }, [tasks]);

  // Carry Over Past Pending Tasks to Today
  const handleCarryOverToToday = () => {
    const today = getTodayKey();
    const now = new Date().toISOString();
    const overdueIds = new Set(overdueTasks.map(t => t.id));

    const updated = tasksRef.current.map(t => {
      if (overdueIds.has(t.id)) {
        return { ...t, date: today, updatedAt: now };
      }
      return t;
    });

    updateTasks(updated);
    setSelectedDateKey(today);
  };

  // Perform Sync with Google Sheets
  const handleSync = useCallback(async (fullReloadFromSheet = false) => {
    const currentSettings = loadSettings();
    if (!currentSettings.googleSheetsUrl) {
      if (fullReloadFromSheet) {
        setIsSettingsOpen(true);
      }
      return;
    }

    if (isSyncingRef.current) {
      pendingChangesDuringSyncRef.current = true;
      return;
    }

    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncMessage(fullReloadFromSheet ? 'Загрузка всех задач из Google Таблицы...' : 'Синхронизация с Google Таблицей...');

    try {
      const isOnlyDemo = tasksRef.current.length > 0 && tasksRef.current.every(t => t.id.startsWith('demo-'));
      const isCleanReload = fullReloadFromSheet || isOnlyDemo;

      if (isCleanReload) {
        clearDeletedTaskIds();
      }

      const currentTasks = isCleanReload ? [] : [...tasksRef.current];
      const currentDeleted = isCleanReload ? {} : loadDeletedTaskIds();
      const currentLastSynced = isCleanReload ? null : currentSettings.lastSyncedAt;

      const { result, mergedTasks, updatedDeletedMap } = await syncWithGoogleSheets(
        currentSettings.googleSheetsUrl,
        currentTasks,
        currentDeleted,
        currentLastSynced
      );

      if (result.success) {
        saveDeletedTaskIds(updatedDeletedMap);

        // If user made changes while network request was in flight, do not overwrite them!
        if (pendingChangesDuringSyncRef.current && !isCleanReload) {
          pendingChangesDuringSyncRef.current = false;
          const latestLocal = tasksRef.current;
          const latestLocalIds = new Set(latestLocal.map(t => t.id));
          const latestDeleted = loadDeletedTaskIds();

          const combined = [...latestLocal];
          for (const mt of mergedTasks) {
            if (!latestLocalIds.has(mt.id) && !latestDeleted[mt.id]) {
              combined.push(mt);
            }
          }
          const { updatedTasks } = ensureRecurringTasks(combined, 7, 45, latestDeleted);
          tasksRef.current = updatedTasks;
          setTasks(updatedTasks);
          saveTasks(updatedTasks);

          // Re-sync after 2s to push user's new in-flight changes to the sheet
          triggerAutoSync();
        } else if (isCleanReload) {
          pendingChangesDuringSyncRef.current = false;
          const { updatedTasks } = ensureRecurringTasks(mergedTasks, 7, 45, updatedDeletedMap);
          tasksRef.current = updatedTasks;
          setTasks(updatedTasks);
          saveTasks(updatedTasks);
        } else {
          pendingChangesDuringSyncRef.current = false;
          const { updatedTasks } = ensureRecurringTasks(mergedTasks, 7, 45, updatedDeletedMap);
          applySyncedTasks(updatedTasks, updatedDeletedMap);
        }

        const newSettings: SyncSettings = {
          ...currentSettings,
          lastSyncedAt: new Date().toISOString()
        };
        setSettings(newSettings);
        saveSettings(newSettings);
        setSyncMessage(`Успешно! Синхронизировано задач: ${result.count}`);
        setTimeout(() => setSyncMessage(null), 3500);
      } else {
        setSyncMessage(`Ошибка: ${result.message}`);
        setTimeout(() => setSyncMessage(null), 5000);
      }
    } catch (err: unknown) {
      console.error('Sync failed', err);
      const msg = err instanceof Error ? err.message : 'сбой сети';
      setSyncMessage(`Ошибка: ${msg}`);
      setTimeout(() => setSyncMessage(null), 5000);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [applySyncedTasks, triggerAutoSync]);

  // Keep handleSyncRef pointing to current handleSync
  useEffect(() => {
    handleSyncRef.current = handleSync;
  }, [handleSync]);

  // Save Settings
  const handleSaveSettings = (newSettings: SyncSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Filter and sort tasks for the selected date
  const dayTasks = useMemo(() => {
    return tasks.filter(t => t.date === selectedDateKey);
  }, [tasks, selectedDateKey]);

  const visibleTasks = useMemo(() => {
    return dayTasks
      .filter(t => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'cancelled') return t.status === 'cancelled' || t.status === 'missed';
        return t.status === activeFilter;
      })
      .sort((a, b) => {
        // Выполненные (завершенные) задачи опускаются в самый низ списка
        const aCompleted = a.status === 'completed' ? 1 : 0;
        const bCompleted = b.status === 'completed' ? 1 : 0;
        if (aCompleted !== bCompleted) {
          return aCompleted - bCompleted;
        }
        return 0;
      });
  }, [dayTasks, activeFilter]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentDateKey={selectedDateKey}
        onDateChange={setSelectedDateKey}
        onOpenCalendar={() => {
          setReschedulingTask(null);
          setIsCalendarOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSyncing={isSyncing}
        onTriggerSync={handleSync}
        hasSyncUrl={Boolean(settings.googleSheetsUrl)}
        canInstall={canInstall && !isStandalone}
        onInstall={handleInstallApp}
      />

      {/* Date Strip / Swiper */}
      <DateStrip
        currentDateKey={selectedDateKey}
        onSelectDate={setSelectedDateKey}
        tasks={tasks}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col pb-36">
        {/* Overdue Tasks Alert */}
        <OverdueAlert
          overdueTasks={overdueTasks}
          onCarryOverToToday={handleCarryOverToToday}
          onViewOverdueDay={(dateKey) => setSelectedDateKey(dateKey)}
        />

        {/* Day Stats & Filter Bar */}
        <StatsBar
          tasks={dayTasks}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* Task List */}
        <div className="flex-1 mt-4 space-y-2.5">
          {visibleTasks.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
                <Inbox className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                {dayTasks.length === 0
                  ? 'На этот день нет задач'
                  : activeFilter === 'pending'
                  ? 'Все запланированные задачи выполнены!'
                  : activeFilter === 'completed'
                  ? 'Пока нет завершенных задач'
                  : activeFilter === 'cancelled'
                  ? 'Нет отмененных задач'
                  : 'На этот день пока нет задач'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {dayTasks.length === 0
                  ? 'Нажмите на кнопку «Новая задача», чтобы запланировать день.'
                  : activeFilter === 'pending'
                  ? 'Отличная работа! В плане на этот день больше ничего не осталось.'
                  : activeFilter === 'completed'
                  ? 'Отмечайте выполненные задачи кружком слева.'
                  : 'Смените вкладку фильтра или добавьте новую задачу.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setIsNewTaskOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить задачу</span>
                </button>
              </div>
            </div>
          ) : (
            visibleTasks.map(task => {
              const rule = getSeriesRecurrenceRule(task, tasks);
              const recLabel = rule && rule.type !== 'none' ? getHumanRecurrenceLabel(rule) : undefined;

              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  recurrenceLabel={recLabel}
                  onStatusChange={handleStatusChange}
                  onMoveDate={handleMoveDate}
                  onDelete={handleStartDeleteTask}
                  onEdit={(t) => setEditingTask(t)}
                  onStopSeries={handleStopSeries}
                  onOpenDatePicker={(t) => {
                    setReschedulingTask(t);
                    setIsCalendarOpen(true);
                  }}
                />
              );
            })
          )}
        </div>
      </main>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-5 right-4 sm:right-[max(1.25rem,calc((100vw-36rem)/2+1.25rem))] z-30">
        <button
          onClick={() => setIsNewTaskOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/40 border border-indigo-400/20 active:scale-95 transition-all group"
          title="Добавить новую задачу"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
          <span className="font-medium text-sm">Новая задача</span>
        </button>
      </div>

      {/* New Task Modal */}
      <NewTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        onAddTask={handleAddTask}
        selectedDateKey={selectedDateKey}
      />

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          key={editingTask.id}
          isOpen={Boolean(editingTask)}
          task={editingTask}
          seriesRule={getSeriesRecurrenceRule(editingTask, tasks)}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveEditedTask}
          onStopSeries={handleStopSeries}
        />
      )}

      {/* Delete Recurring Task Modal */}
      <DeleteRecurringModal
        isOpen={Boolean(deletingRecurringTask)}
        task={deletingRecurringTask}
        recurrenceLabel={
          deletingRecurringTask
            ? (() => {
                const rule = getSeriesRecurrenceRule(deletingRecurringTask, tasks);
                return rule && rule.type !== 'none' ? getHumanRecurrenceLabel(rule) : 'Цикл';
              })()
            : undefined
        }
        onClose={() => setDeletingRecurringTask(null)}
        onConfirm={handleConfirmDeleteRecurring}
      />

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={isCalendarOpen}
        onClose={() => {
          setIsCalendarOpen(false);
          setReschedulingTask(null);
        }}
        currentSelectedDate={selectedDateKey}
        targetTask={reschedulingTask}
        onSelectDate={(newDate) => {
          if (reschedulingTask) {
            handleMoveDate(reschedulingTask.id, newDate);
          } else {
            setSelectedDateKey(newDate);
          }
        }}
      />

      {/* Settings & Sync Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onManualSync={() => handleSync(false)}
        onFullReloadFromSheet={() => handleSync(true)}
        isSyncing={isSyncing}
        syncMessage={syncMessage}
        tasks={tasks}
        canInstall={canInstall}
        onInstall={handleInstallApp}
        isStandalone={isStandalone}
        onImportTasks={(imported) => {
          const { updatedTasks } = ensureRecurringTasks(imported, 7, 45, loadDeletedTaskIds());
          updateTasks(updatedTasks);
        }}
      />
    </div>
  );
};
