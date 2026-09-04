import React from 'react';
import { AlertCircle, ArrowRight, Calendar } from 'lucide-react';
import { Task } from '../types';

interface OverdueAlertProps {
  overdueTasks: Task[];
  onCarryOverToToday: () => void;
  onViewOverdueDay: (dateKey: string) => void;
}

export const OverdueAlert: React.FC<OverdueAlertProps> = ({
  overdueTasks,
  onCarryOverToToday,
  onViewOverdueDay
}) => {
  if (overdueTasks.length === 0) return null;

  // Find most recent overdue date
  const latestOverdueDate = overdueTasks.reduce((latest, t) => (t.date > latest ? t.date : latest), overdueTasks[0].date);

  return (
    <div className="bg-amber-950/40 border border-amber-600/40 rounded-2xl p-3.5 mb-4 text-amber-200">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-amber-200">
            {overdueTasks.length === 1
              ? 'Осталась 1 невыполненная задача с прошлых дней'
              : `Осталось ${overdueTasks.length} невыполненных задач с прошлых дней`}
          </h4>
          <p className="text-xs text-amber-300/80 mt-0.5">
            Хотите перенести их на сегодня, чтобы они не потерялись?
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <button
              onClick={onCarryOverToToday}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 transition flex items-center gap-1 active:scale-95 shadow-sm"
            >
              <span>Перенести всё на сегодня</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onViewOverdueDay(latestOverdueDate)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition flex items-center gap-1"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Открыть день</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
