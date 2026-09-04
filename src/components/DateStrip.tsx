import React, { useRef, useEffect } from 'react';
import { getSurroundingDays } from '../utils/dateUtils';
import { Task } from '../types';

interface DateStripProps {
  currentDateKey: string;
  onSelectDate: (dateKey: string) => void;
  tasks: Task[];
}

export const DateStrip: React.FC<DateStripProps> = ({
  currentDateKey,
  onSelectDate,
  tasks
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeDayRef = useRef<HTMLButtonElement>(null);
  const days = getSurroundingDays(currentDateKey, 7, 14);

  // Group task counts by date
  const pendingCountByDate = tasks.reduce<Record<string, number>>((acc, task) => {
    if (task.status === 'pending') {
      acc[task.date] = (acc[task.date] || 0) + 1;
    }
    return acc;
  }, {});

  // Scroll active day into view
  useEffect(() => {
    if (activeDayRef.current && scrollRef.current) {
      activeDayRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [currentDateKey]);

  return (
    <div className="bg-slate-900 border-b border-slate-800/80 py-2.5">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto no-scrollbar px-4 max-w-xl mx-auto scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {days.map((day) => {
          const isSelected = day.key === currentDateKey;
          const pendingCount = pendingCountByDate[day.key] || 0;

          return (
            <button
              key={day.key}
              ref={isSelected ? activeDayRef : null}
              onClick={() => onSelectDate(day.key)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-12 py-2 rounded-2xl transition-all relative ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105 font-bold'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/40'
              }`}
            >
              {day.isToday && !isSelected && (
                <span className="absolute -top-1 w-2 h-2 bg-indigo-400 rounded-full"></span>
              )}
              <span className={`text-[10px] tracking-wider uppercase ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                {day.weekdayShort}
              </span>
              <span className="text-base leading-tight mt-0.5 font-semibold">
                {day.dayNumber}
              </span>
              {pendingCount > 0 && (
                <div className="flex items-center gap-0.5 mt-1">
                  <span className={`text-[9px] px-1 rounded-full ${isSelected ? 'bg-indigo-800 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    {pendingCount}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
