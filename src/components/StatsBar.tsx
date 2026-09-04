import React from 'react';
import { Task, DayFilter } from '../types';
import { CheckCircle2, XCircle, Clock, ListTodo } from 'lucide-react';

interface StatsBarProps {
  tasks: Task[];
  activeFilter: DayFilter;
  onFilterChange: (filter: DayFilter) => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  tasks,
  activeFilter,
  onFilterChange
}) => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const cancelled = tasks.filter(t => t.status === 'cancelled' || t.status === 'missed').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-slate-900/40 rounded-2xl p-3 border border-slate-800 space-y-2.5">
      {/* Progress line */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Прогресс дня</span>
        <span className="font-semibold text-slate-200">{completionPercent}% ({completed} из {total})</span>
      </div>

      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
        {completed > 0 && (
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        )}
        {cancelled > 0 && (
          <div
            className="bg-slate-600 h-full transition-all duration-300"
            style={{ width: `${(cancelled / total) * 100}%` }}
          />
        )}
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-4 gap-1 pt-1 text-xs">
        <button
          onClick={() => onFilterChange('all')}
          className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition ${
            activeFilter === 'all'
              ? 'bg-slate-800 text-white font-medium border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <ListTodo className="w-3.5 h-3.5" />
          <span>Все ({total})</span>
        </button>

        <button
          onClick={() => onFilterChange('pending')}
          className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition ${
            activeFilter === 'pending'
              ? 'bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30'
              : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/40'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>В плане ({pending})</span>
        </button>

        <button
          onClick={() => onFilterChange('completed')}
          className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition ${
            activeFilter === 'completed'
              ? 'bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30'
              : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/40'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Сделано ({completed})</span>
        </button>

        <button
          onClick={() => onFilterChange('cancelled')}
          className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition ${
            activeFilter === 'cancelled'
              ? 'bg-rose-500/20 text-rose-300 font-medium border border-rose-500/30'
              : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800/40'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Отмена ({cancelled})</span>
        </button>
      </div>
    </div>
  );
};
