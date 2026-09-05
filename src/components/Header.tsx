import React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Settings, RefreshCw, Download } from 'lucide-react';
import { getFriendlyDateTitle, isToday, addDays } from '../utils/dateUtils';

interface HeaderProps {
  currentDateKey: string;
  onDateChange: (dateKey: string) => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  isSyncing: boolean;
  onTriggerSync?: () => void;
  hasSyncUrl: boolean;
  canInstall?: boolean;
  onInstall?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDateKey,
  onDateChange,
  onOpenCalendar,
  onOpenSettings,
  isSyncing,
  onTriggerSync,
  hasSyncUrl,
  canInstall,
  onInstall
}) => {
  const { title, subtitle } = getFriendlyDateTitle(currentDateKey);
  const currentlyToday = isToday(currentDateKey);

  const handlePrevDay = () => onDateChange(addDays(currentDateKey, -1));
  const handleNextDay = () => onDateChange(addDays(currentDateKey, 1));
  const handleGoToday = () => onDateChange(new Date().toISOString().split('T')[0]);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 sm:px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
        {/* Date title: on mobile keep the month on its own line; "К сегодня" sits next to the weekday */}
        <div className="min-w-0 flex-1 pr-1">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight whitespace-nowrap">
              {title}
            </h1>
            {!currentlyToday && (
              <button
                onClick={handleGoToday}
                className="hidden sm:inline-flex shrink-0 text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-medium transition"
              >
                К сегодня
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 min-w-0">
            <p className="text-xs text-slate-400 capitalize truncate">{subtitle}</p>
            {!currentlyToday && (
              <button
                onClick={handleGoToday}
                className="sm:hidden shrink-0 text-[11px] leading-none px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-medium active:bg-indigo-500/30"
              >
                К сегодня
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Quick Install button for desktop if browser supports it */}
          {canInstall && onInstall && (
            <button
              onClick={onInstall}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition active:scale-95 mr-1"
              title="Установить приложение на компьютер"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Установить на ПК</span>
            </button>
          )}

          {/* Day navigation arrows */}
          <div className="flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700/60">
            <button
              onClick={handlePrevDay}
              className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition active:scale-95"
              title="Предыдущий день"
              aria-label="Предыдущий день"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenCalendar}
              className="px-1.5 sm:px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition flex items-center gap-1 text-xs"
              title="Выбрать конкретную дату"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNextDay}
              className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition active:scale-95"
              title="Следующий день"
              aria-label="Следующий день"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Sync Button */}
          {hasSyncUrl && (
            <button
              onClick={onTriggerSync}
              disabled={isSyncing}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 border border-slate-700/60 transition active:scale-95 disabled:opacity-50"
              title="Синхронизировать с Google Таблицей"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition active:scale-95 relative"
            title="Настройки и синхронизация"
          >
            <Settings className="w-4 h-4" />
            {!hasSyncUrl && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400"></span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
