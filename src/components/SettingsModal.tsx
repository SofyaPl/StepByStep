import React, { useState } from 'react';
import {
  X,
  Cloud,
  Smartphone,
  Download,
  Upload,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  Database
} from 'lucide-react';
import { SyncSettings, Task } from '../types';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '../services/googleSheets';
import { forceAppUpdate } from '../serviceWorkerHelper';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SyncSettings;
  onSaveSettings: (settings: SyncSettings) => void;
  onManualSync: () => void;
  onFullReloadFromSheet?: () => void;
  isSyncing: boolean;
  syncMessage: string | null;
  tasks: Task[];
  onImportTasks: (tasks: Task[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onManualSync,
  onFullReloadFromSheet,
  isSyncing,
  syncMessage,
  tasks,
  onImportTasks
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'install' | 'backup'>('sync');
  const [url, setUrl] = useState(settings.googleSheetsUrl);
  const [autoSync, setAutoSync] = useState(settings.autoSync);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showScriptDetails, setShowScriptDetails] = useState(false);
  const [showInstructions, setShowInstructions] = useState(!settings.googleSheetsUrl);
  const [isUpdatingApp, setIsUpdatingApp] = useState(false);

  if (!isOpen) return null;

  const handleForceUpdate = async () => {
    setIsUpdatingApp(true);
    await forceAppUpdate();
  };

  const handleSaveSyncSettings = () => {
    onSaveSettings({
      ...settings,
      googleSheetsUrl: url.trim(),
      autoSync
    });
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `step-by-step-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          onImportTasks(parsed);
          alert(`Успешно импортировано ${parsed.length} задач`);
        } else {
          alert('Некорректный формат файла бэкапа');
        }
      } catch (err) {
        alert('Ошибка при чтении файла');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Настройки приложения</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800/80 my-3 shrink-0">
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-2 px-1 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              activeTab === 'sync'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Таблицы</span>
          </button>
          <button
            onClick={() => setActiveTab('install')}
            className={`py-2 px-1 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              activeTab === 'install'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Телефон</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-2 px-1 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              activeTab === 'backup'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Резерв</span>
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <label className="block text-slate-300 font-medium">
                  URL веб-приложения Google Таблицы:
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-slate-300 text-xs">Автоматически синхронизировать при изменениях</span>
                </label>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={handleSaveSyncSettings}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition text-xs"
                  >
                    Сохранить адрес
                  </button>

                  <button
                    onClick={() => {
                      handleSaveSyncSettings();
                      onManualSync();
                    }}
                    disabled={isSyncing || !url}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-40 transition flex items-center gap-1 text-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Синхронизировать сейчас</span>
                  </button>

                  {onFullReloadFromSheet && (
                    <button
                      onClick={() => {
                        handleSaveSyncSettings();
                        onFullReloadFromSheet();
                      }}
                      disabled={isSyncing || !url}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 text-amber-300 font-medium hover:bg-slate-700 border border-amber-500/30 disabled:opacity-40 transition flex items-center gap-1 text-xs"
                      title="Загрузить все задачи из таблицы заново"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>Восстановить всё из таблицы</span>
                    </button>
                  )}
                </div>

                {syncMessage && (
                  <p className="text-[11px] text-slate-300 bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/60">
                    {syncMessage}
                  </p>
                )}

                {settings.lastSyncedAt && (
                  <p className="text-[11px] text-slate-500">
                    Последняя синхронизация: {new Date(settings.lastSyncedAt).toLocaleString('ru-RU')}
                  </p>
                )}
              </div>

              {/* Instructions Accordion */}
              <div className="bg-slate-950/40 rounded-2xl border border-slate-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="w-full p-3 flex items-center justify-between hover:bg-slate-850/50 transition text-left"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Инструкция по настройке таблицы</span>
                  </div>
                  <span className="text-xs text-indigo-400 font-medium">
                    {showInstructions ? 'Скрыть ▲' : 'Показать ▼'}
                  </span>
                </button>

                {showInstructions && (
                  <div className="p-3.5 pt-1 space-y-2.5 border-t border-slate-800/60 mt-1">
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-300 font-medium text-[11px]">Пошаговый план:</span>
                      <button
                        onClick={() => setShowScriptDetails(!showScriptDetails)}
                        className="text-indigo-400 hover:underline text-[11px]"
                      >
                        {showScriptDetails ? 'Скрыть код' : 'Показать код'}
                      </button>
                    </div>

                    <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
                      <li>Создайте новую таблицу в Google Sheets (любое имя).</li>
                      <li>В меню выберите <b>Расширения (Extensions)</b> → <b>Apps Script</b>.</li>
                      <li>Вставьте готовый код (кнопка ниже) и нажмите <b>Сохранить (Ctrl+S)</b>.</li>
                      <li>Справа вверху: <b>Развернуть</b> → <b>Новое развертывание</b> (тип: <b>Веб-приложение</b>, доступ: <b>Все / Anyone</b>).</li>
                      <li>
                        <i>Если Google покажет «Google hasn't verified this app»:</i> нажмите <b>Advanced (Дополнительно)</b> → <b>Go to ... (unsafe) / Перейти (небезопасно)</b> → <b>Allow (Разрешить)</b>.
                      </li>
                      <li>Скопируйте полученную ссылку веб-приложения и вставьте в поле выше!</li>
                    </ol>

                    <button
                      onClick={handleCopyScript}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition flex items-center justify-center gap-1.5 text-xs font-medium"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Код скрипта скопирован в буфер!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Скопировать готовый код для Google Apps Script</span>
                        </>
                      )}
                    </button>

                    {showScriptDetails && (
                      <pre className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 overflow-x-auto max-h-40 font-mono">
                        {GOOGLE_APPS_SCRIPT_TEMPLATE}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'install' && (
            <div className="space-y-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <h4 className="font-semibold text-slate-200 text-sm">
                Как перенести на экран смартфона:
              </h4>

              <div className="space-y-3 pt-1 text-slate-300">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <h5 className="font-semibold text-indigo-400 flex items-center gap-1">
                    <span>🍏 На iPhone / iPad (Safari)</span>
                  </h5>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    1. Откройте сайт приложения в браузере <b>Safari</b>.<br />
                    2. Нажмите иконку <b>«Поделиться»</b> (квадратик со стрелкой вверх внизу экрана).<br />
                    3. Прокрутите список и выберите <b>«На экран Домой»</b>.<br />
                    4. Нажмите «Добавить». Теперь приложение запускается как обычная программа без рамок браузера!
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <h5 className="font-semibold text-emerald-400 flex items-center gap-1">
                    <span>🤖 На Android (Chrome / Яндекс)</span>
                  </h5>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    1. Откройте сайт в <b>Google Chrome</b> или Яндекс Браузере.<br />
                    2. Нажмите на три точки в правом верхнем углу.<br />
                    3. Выберите <b>«Установить приложение»</b> или «Добавить на главный экран».<br />
                    4. Подтвердите установку.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <h4 className="font-semibold text-slate-200 text-sm">
                Резервные копии и безопасность:
              </h4>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Все ваши задачи всегда сохраняются прямо в памяти браузера телефона и компьютера. Вы в любой момент можете скачать копию в формате JSON или загрузить задачи обратно.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={handleExportBackup}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex flex-col items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4 text-indigo-400" />
                  <span className="font-medium">Скачать бэкап ({tasks.length})</span>
                </button>

                <label className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium">Восстановить из файла</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* App Version & Force Update Footer */}
        <div className="pt-3 pb-1 mt-auto border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0 bg-slate-900">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">ШагЗаШагом</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 font-mono border border-slate-700/60">
              v1.2
            </span>
          </div>
          <button
            type="button"
            onClick={handleForceUpdate}
            disabled={isUpdatingApp}
            className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Очистить кэш приложения и загрузить свежую версию"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingApp ? 'animate-spin' : ''}`} />
            <span>{isUpdatingApp ? 'Обновляем...' : 'Обновить версию'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
