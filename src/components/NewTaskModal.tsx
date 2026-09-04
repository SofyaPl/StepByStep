import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Plus, MessageSquare, Calendar, Repeat, ChevronLeft, ChevronRight } from 'lucide-react';
import { getFriendlyDateTitle, addDays } from '../utils/dateUtils';
import { getUpcomingRecurrencePreview } from '../utils/recurrenceUtils';
import { RecurrenceRule, RecurrenceType } from '../types';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (title: string, notes?: string, recurrence?: RecurrenceRule) => void;
  selectedDateKey: string;
}

const WEEKDAYS = [
  { id: 1, label: 'Пн' },
  { id: 2, label: 'Вт' },
  { id: 3, label: 'Ср' },
  { id: 4, label: 'Чт' },
  { id: 5, label: 'Пт' },
  { id: 6, label: 'Сб' },
  { id: 0, label: 'Вс' },
];

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  selectedDateKey
}) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [recOption, setRecOption] = useState<'none' | 'daily' | 'interval' | 'weekdays' | 'yearly'>('none');
  const [intervalDays, setIntervalDays] = useState<number>(3); // 3 = каждые 3 дня (через 2 дня)
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setRecOption('none');
    setIntervalDays(3);
    setSelectedWeekdays([]);
    setHasEndDate(false);
    setEndDate(addDays(selectedDateKey, 28));
  };

  // Focus input and reset when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, selectedDateKey]);

  // Compute active recurrence rule for preview and submission
  const currentRecurrenceRule: RecurrenceRule | undefined = useMemo(() => {
    if (recOption === 'none') return undefined;

    let type: RecurrenceType = 'daily';
    let interval = 1;

    if (recOption === 'daily') {
      type = 'daily';
      interval = 1;
    } else if (recOption === 'interval') {
      type = 'daily';
      interval = Math.max(2, intervalDays || 2);
    } else if (recOption === 'weekdays') {
      type = 'weekdays';
    } else if (recOption === 'yearly') {
      type = 'yearly';
    }

    return {
      type,
      interval: type === 'daily' ? interval : undefined,
      daysOfWeek: type === 'weekdays' ? (selectedWeekdays.length > 0 ? selectedWeekdays : [1]) : undefined,
      startDate: selectedDateKey,
      endDate: hasEndDate && endDate ? endDate : undefined
    };
  }, [recOption, intervalDays, selectedWeekdays, selectedDateKey, hasEndDate, endDate]);

  // Upcoming dates preview
  const previewDates = useMemo(() => {
    if (!currentRecurrenceRule) return [];
    return getUpcomingRecurrencePreview(selectedDateKey, currentRecurrenceRule, 4);
  }, [selectedDateKey, currentRecurrenceRule]);

  if (!isOpen) return null;

  const { title: dayTitle, subtitle: daySubtitle } = getFriendlyDateTitle(selectedDateKey);

  const toggleWeekday = (dayId: number) => {
    if (selectedWeekdays.includes(dayId)) {
      setSelectedWeekdays(selectedWeekdays.filter(d => d !== dayId));
    } else {
      setSelectedWeekdays([...selectedWeekdays, dayId]);
    }
  };

  const handleSelectWeekdaysPreset = (preset: 'workdays' | 'weekends' | 'all') => {
    if (preset === 'workdays') setSelectedWeekdays([1, 2, 3, 4, 5]);
    else if (preset === 'weekends') setSelectedWeekdays([6, 0]);
    else setSelectedWeekdays([1, 2, 3, 4, 5, 6, 0]);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    onAddTask(title.trim(), notes.trim() || undefined, currentRecurrenceRule);
    resetForm();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Helper description of current interval
  const getIntervalDescription = () => {
    if (intervalDays === 2) return 'день отдыхаем, день делаем (через день)';
    if (intervalDays === 3) return '2 дня перерыв, на 3-й день делаем (через 2 дня)';
    if (intervalDays === 4) return '3 дня перерыв, на 4-й день делаем (через 3 дня)';
    if (intervalDays === 6) return '5 дней перерыв, на 6-й день делаем (через 5 дней)';
    return `${intervalDays - 1} дн. перерыв между повторами`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Новая задача</h3>
              <p className="text-xs text-indigo-400 font-medium flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" />
                <span>{dayTitle} ({daySubtitle})</span>
              </p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Field */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Название задачи:
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что нужно сделать?"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-base font-medium text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Notes Field */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Комментарий или подробности (необязательно):</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Номера документов, адреса, ссылки, дозировка уколов/таблеток..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
            />
          </div>

          {/* Recurrence Section */}
          <div className="space-y-2.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Repeat className="w-3.5 h-3.5 text-indigo-400" />
              <span>Повторение (цикл):</span>
            </div>

            {/* Recurrence Mode Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setRecOption('none')}
                className={`py-1.5 px-2.5 rounded-xl border transition text-center ${
                  recOption === 'none'
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-medium'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Без повтора
              </button>

              <button
                type="button"
                onClick={() => setRecOption('daily')}
                className={`py-1.5 px-2.5 rounded-xl border transition text-center ${
                  recOption === 'daily'
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-medium'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Каждый день
              </button>

              <button
                type="button"
                onClick={() => setRecOption('interval')}
                className={`py-1.5 px-2.5 rounded-xl border transition text-center ${
                  recOption === 'interval'
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-medium'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Через N дней
              </button>

              <button
                type="button"
                onClick={() => {
                  setRecOption('weekdays');
                  if (selectedWeekdays.length === 0) {
                    const currentDayOfWeek = new Date(selectedDateKey).getDay();
                    setSelectedWeekdays([currentDayOfWeek]);
                  }
                }}
                className={`py-1.5 px-2.5 rounded-xl border transition text-center ${
                  recOption === 'weekdays'
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-medium'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                По дням недели
              </button>

              <button
                type="button"
                onClick={() => setRecOption('yearly')}
                className={`py-1.5 px-2.5 rounded-xl border transition text-center col-span-2 sm:col-span-1 ${
                  recOption === 'yearly'
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-medium'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Раз в год
              </button>
            </div>

            {/* Interval Configurator (When 'Через N дней' is selected) */}
            {recOption === 'interval' && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Частота повторения:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Каждые</span>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-inner">
                      <button
                        type="button"
                        onClick={() => setIntervalDays(Math.max(2, intervalDays - 1))}
                        className="p-1 px-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Уменьшить"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min={2}
                        max={365}
                        value={intervalDays}
                        onChange={(e) => setIntervalDays(Math.max(2, parseInt(e.target.value) || 2))}
                        className="w-9 bg-transparent text-center text-xs font-bold text-indigo-300 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setIntervalDays(intervalDays + 1)}
                        className="p-1 px-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Увеличить"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-400">дн.</span>
                  </div>
                </div>

                <div className="text-[11px] text-indigo-300/90 bg-indigo-950/40 border border-indigo-900/30 px-2.5 py-1.5 rounded-xl">
                  {getIntervalDescription()}
                </div>

                {/* Quick Interval Preset Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIntervalDays(2)}
                    className={`px-2.5 py-1 rounded-xl text-xs border transition ${
                      intervalDays === 2
                        ? 'bg-indigo-600 text-white border-indigo-500 font-medium shadow-sm'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    Через 1 день (через день)
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntervalDays(3)}
                    className={`px-2.5 py-1 rounded-xl text-xs border transition ${
                      intervalDays === 3
                        ? 'bg-indigo-600 text-white border-indigo-500 font-medium shadow-sm'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    Через 2 дня (на 3-й)
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntervalDays(4)}
                    className={`px-2.5 py-1 rounded-xl text-xs border transition ${
                      intervalDays === 4
                        ? 'bg-indigo-600 text-white border-indigo-500 font-medium shadow-sm'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    Через 3 дня
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntervalDays(6)}
                    className={`px-2.5 py-1 rounded-xl text-xs border transition ${
                      intervalDays === 6
                        ? 'bg-indigo-600 text-white border-indigo-500 font-medium shadow-sm'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    Через 5 дней
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntervalDays(5)}
                    className={`px-2.5 py-1 rounded-xl text-xs border transition ${
                      intervalDays === 5
                        ? 'bg-indigo-600 text-white border-indigo-500 font-medium shadow-sm'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    Каждые 5 дней
                  </button>
                </div>
              </div>
            )}

            {/* Weekdays picker (if weekdays option selected) */}
            {recOption === 'weekdays' && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Выберите дни недели:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectWeekdaysPreset('workdays')}
                      className="text-indigo-400 hover:underline"
                    >
                      Будни
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectWeekdaysPreset('weekends')}
                      className="text-indigo-400 hover:underline"
                    >
                      Выходные
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1">
                  {WEEKDAYS.map(day => {
                    const isSelected = selectedWeekdays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleWeekday(day.id)}
                        className={`w-9 h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-850 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Schedule Dates Preview */}
            {recOption !== 'none' && previewDates.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-[11px] text-indigo-200 flex items-start gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400">График дат: </span>
                    <span className="font-semibold text-indigo-200">
                      {previewDates.join(' → ')}
                      {hasEndDate && endDate ? ' ...до ' + endDate.split('-').reverse().join('.') : '...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* End Date (Duration limit) if recurring */}
            {recOption !== 'none' && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasEndDate}
                    onChange={(e) => setHasEndDate(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs text-slate-300">
                    Ограничить срок цикла (курс, дедлайн)
                  </span>
                </label>

                {hasEndDate && (
                  <div className="flex items-center gap-2 pt-1 pl-6">
                    <span className="text-xs text-slate-400">Повторять до:</span>
                    <input
                      type="date"
                      value={endDate}
                      min={selectedDateKey}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Ctrl+Enter для сохранения
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition text-center"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!title.trim() || (recOption === 'weekdays' && selectedWeekdays.length === 0)}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить задачу</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
