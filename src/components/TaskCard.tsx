import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import {
  CheckCircle2,
  Circle,
  XCircle,
  MinusCircle,
  Calendar,
  ArrowRight,
  Trash2,
  Edit2,
  MoreHorizontal,
  Repeat,
  Ban
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { addDays, getTodayKey } from '../utils/dateUtils';
import { getHumanRecurrenceLabel, isRecurringTask } from '../utils/recurrenceUtils';

interface TaskCardProps {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onMoveDate: (id: string, newDate: string) => void;
  onDelete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onOpenDatePicker: (task: Task) => void;
  recurrenceLabel?: string;
  onStopSeries?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onStatusChange,
  onMoveDate,
  onDelete,
  onEdit,
  onOpenDatePicker,
  recurrenceLabel,
  onStopSeries
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const isCompleted = task.status === 'completed';
  const isCancelled = task.status === 'cancelled';
  const isMissed = task.status === 'missed';
  const isTaskToday = task.date === getTodayKey();
  const isRecurring = isRecurringTask(task);
  const recBadgeText = recurrenceLabel || (task.recurrence ? getHumanRecurrenceLabel(task.recurrence) : 'Цикл');

  const handleToggleComplete = () => {
    if (isCompleted) {
      onStatusChange(task.id, 'pending');
    } else {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 }
      });
      onStatusChange(task.id, 'completed');
    }
  };

  const handleToggleCancel = () => {
    if (isCancelled || isMissed) {
      onStatusChange(task.id, 'pending');
    } else {
      onStatusChange(task.id, 'cancelled');
    }
  };

  const handleMoveToTomorrow = () => {
    const tomorrow = addDays(task.date, 1);
    onMoveDate(task.id, tomorrow);
  };

  const handleMoveToToday = () => {
    onMoveDate(task.id, getTodayKey());
  };

  return (
    <div
      className={`group rounded-2xl border transition-all duration-200 p-3.5 relative ${
        isCompleted
          ? 'bg-slate-900/40 border-emerald-900/40 opacity-80'
          : isCancelled
          ? 'bg-slate-900/20 border-slate-800/80 opacity-60'
          : isMissed
          ? 'bg-slate-900/30 border-amber-900/30 opacity-75'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700/80 shadow-sm'
      }`}
    >
      <div>
        <div className="flex items-start gap-3">
          {/* Status Button */}
          <button
            onClick={handleToggleComplete}
            className="mt-0.5 shrink-0 transition-transform active:scale-90"
            title={isCompleted ? 'Отметить как невыполненную' : 'Завершить задачу'}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
            ) : isCancelled ? (
              <XCircle className="w-5 h-5 text-slate-500" />
            ) : isMissed ? (
              <MinusCircle className="w-5 h-5 text-amber-500/60" />
            ) : (
              <Circle className="w-5 h-5 text-slate-400 hover:text-indigo-400" />
            )}
          </button>

          {/* Task Content */}
          <div className="flex-1 min-w-0" onClick={() => setShowMenu(!showMenu)}>
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className={`text-sm leading-snug break-words ${
                  isCompleted
                    ? 'line-through text-slate-400 font-normal'
                    : isCancelled
                    ? 'line-through text-slate-500 italic'
                    : isMissed
                    ? 'text-slate-300 italic'
                    : 'text-slate-100 font-medium'
                }`}
              >
                {task.title}
              </p>

              {/* Recurrence badge - clickable to edit recurrence */}
              {isRecurring && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 font-medium transition active:scale-95 cursor-pointer"
                  title="Нажмите, чтобы настроить или остановить цикл"
                >
                  <Repeat className="w-2.5 h-2.5" />
                  <span>{recBadgeText || 'Цикл'}</span>
                </button>
              )}
            </div>

            {task.notes && (
              <p className={`text-xs mt-1 break-words ${
                isCompleted || isCancelled ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {task.notes}
              </p>
            )}

            {/* Status Badges */}
            <div className="flex items-center gap-2 mt-2">
              {isCompleted && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">
                  Завершено
                </span>
              )}
              {isCancelled && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 font-medium">
                  Отменено
                </span>
              )}
              {isMissed && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-medium">
                  Пропущен эпизод
                </span>
              )}
            </div>
          </div>

          {/* More actions toggle */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Действия"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Action strip / Quick Tools */}
        {showMenu && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-1.5 animate-in fade-in duration-150">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Cancel button */}
              <button
                onClick={handleToggleCancel}
                className={`text-xs px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                  isCancelled || isMissed
                    ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                    : 'border-slate-700/80 hover:border-rose-500/40 text-slate-300 hover:text-rose-300'
                }`}
                title="Отменить задачу"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isCancelled || isMissed ? 'Возобновить' : 'Отменить'}</span>
              </button>

              {/* Move to today if not today */}
              {!isTaskToday && (
                <button
                  onClick={handleMoveToToday}
                  className="text-xs px-2.5 py-1 rounded-lg border border-slate-700/80 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 transition flex items-center gap-1"
                  title="Перенести на сегодня"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>На сегодня</span>
                </button>
              )}

              {/* Move to tomorrow */}
              <button
                onClick={handleMoveToTomorrow}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-700/80 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 transition flex items-center gap-1"
                title="Перенести на завтра"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>На завтра</span>
              </button>

              {/* Pick specific date */}
              <button
                onClick={() => onOpenDatePicker(task)}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-700/80 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 transition flex items-center gap-1"
                title="Выбрать день для переноса"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Выбрать день</span>
              </button>

              {/* Quick Stop Cycle button if recurring */}
              {isRecurring && onStopSeries && (
                <button
                  onClick={() => onStopSeries(task)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-amber-900/40 hover:border-amber-500/40 text-amber-300/80 hover:text-amber-300 transition flex items-center gap-1"
                  title="Прекратить цикл с этого дня"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Остановить цикл</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 ml-auto">
              {/* Full Edit Modal */}
              <button
                onClick={() => onEdit(task)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-1 text-xs"
                title="Редактировать задачу и график повторений"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Изменить</span>
              </button>

              {/* Delete */}
              <button
                onClick={() => onDelete(task)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Удалить"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
