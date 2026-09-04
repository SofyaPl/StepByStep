import React from 'react';
import { X, Trash2, Calendar, Ban, AlertTriangle } from 'lucide-react';
import { Task } from '../types';
import { getFriendlyDateTitle } from '../utils/dateUtils';

interface DeleteRecurringModalProps {
  isOpen: boolean;
  task: Task | null;
  recurrenceLabel?: string;
  onClose: () => void;
  onConfirm: (task: Task, mode: 'single' | 'future' | 'all') => void;
}

export const DeleteRecurringModal: React.FC<DeleteRecurringModalProps> = ({
  isOpen,
  task,
  recurrenceLabel,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !task) return null;

  const { title: dayTitle, subtitle: daySubtitle } = getFriendlyDateTitle(task.date);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Удаление задачи</h3>
              <p className="text-xs text-slate-400">Эта задача входит в повторяющийся цикл</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task summary */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
          <p className="text-sm font-semibold text-white break-words">{task.title}</p>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-indigo-300">
            <span>{dayTitle} ({daySubtitle})</span>
            {recurrenceLabel && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-indigo-400 font-medium">{recurrenceLabel}</span>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-300 font-medium">Как вы хотите поступить?</p>

        {/* Options */}
        <div className="space-y-2">
          {/* Option 1: Only this single day */}
          <button
            type="button"
            onClick={() => onConfirm(task, 'single')}
            className="w-full text-left p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition group flex items-start gap-3 active:scale-[0.99]"
          >
            <div className="p-2 rounded-xl bg-slate-700/50 text-slate-300 shrink-0 mt-0.5 group-hover:text-white">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition">
                Удалить только на этот день
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Пропустим сегодня, а следующие запланированные дни цикла сохранятся.
              </div>
            </div>
          </button>

          {/* Option 2: Stop cycle from today onwards */}
          <button
            type="button"
            onClick={() => onConfirm(task, 'future')}
            className="w-full text-left p-3 rounded-2xl bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/30 transition group flex items-start gap-3 active:scale-[0.99]"
          >
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-200 group-hover:text-amber-100 transition">
                Остановить цикл с этого дня
              </div>
              <div className="text-[11px] text-amber-300/70 mt-0.5">
                Прошлые дни останутся в истории, а все будущие повторения исчезнут.
              </div>
            </div>
          </button>

          {/* Option 3: Delete all instances completely */}
          <button
            type="button"
            onClick={() => onConfirm(task, 'all')}
            className="w-full text-left p-3 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 transition group flex items-start gap-3 active:scale-[0.99]"
          >
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-rose-300 group-hover:text-rose-200 transition">
                Удалить весь цикл полностью
              </div>
              <div className="text-[11px] text-rose-300/70 mt-0.5">
                Стереть все повторения этой задачи (и прошлые, и будущие).
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-medium transition text-center"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};
