import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Check } from 'lucide-react';
import { getTodayKey, addDays, getFriendlyDateTitle } from '../utils/dateUtils';
import { Task } from '../types';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (dateKey: string) => void;
  targetTask?: Task | null; // If rescheduling a task
  currentSelectedDate: string;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  targetTask,
  currentSelectedDate
}) => {
  const [selectedDate, setSelectedDate] = useState(currentSelectedDate);

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(targetTask ? targetTask.date : currentSelectedDate);
    }
  }, [isOpen, targetTask, currentSelectedDate]);

  if (!isOpen) return null;

  const todayKey = getTodayKey();
  const tomorrowKey = addDays(todayKey, 1);
  const afterTomorrowKey = addDays(todayKey, 2);
  const nextWeekKey = addDays(todayKey, 7);

  const handleApply = () => {
    if (selectedDate) {
      onSelectDate(selectedDate);
      onClose();
    }
  };

  const handleQuickSelect = (dateKey: string) => {
    setSelectedDate(dateKey);
    onSelectDate(dateKey);
    onClose();
  };

  const friendly = selectedDate ? getFriendlyDateTitle(selectedDate) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {targetTask ? 'Перенести задачу' : 'Выбрать дату'}
              </h3>
              {targetTask && (
                <p className="text-xs text-slate-400 truncate max-w-[200px]">
                  «{targetTask.title}»
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick buttons */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => handleQuickSelect(todayKey)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white transition text-center font-medium"
          >
            Сегодня
          </button>
          <button
            onClick={() => handleQuickSelect(tomorrowKey)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white transition text-center font-medium"
          >
            Завтра
          </button>
          <button
            onClick={() => handleQuickSelect(afterTomorrowKey)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white transition text-center font-medium"
          >
            Послезавтра
          </button>
          <button
            onClick={() => handleQuickSelect(nextWeekKey)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white transition text-center font-medium"
          >
            Через неделю
          </button>
        </div>

        {/* Exact date input */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-medium text-slate-400">
            Или выберите точный день:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
          />
          {friendly && (
            <p className="text-xs text-indigo-400 px-1 pt-1 font-medium">
              Выбрано: {friendly.title} ({friendly.subtitle})
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition"
          >
            Отмена
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition flex items-center gap-1 shadow-md shadow-indigo-600/20"
          >
            <Check className="w-4 h-4" />
            <span>Применить</span>
          </button>
        </div>
      </div>
    </div>
  );
};
