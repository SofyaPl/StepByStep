import React, { useState, useRef } from 'react';
import { Plus, MessageSquare, X } from 'lucide-react';

interface NewTaskInputProps {
  onAddTask: (title: string, notes?: string) => void;
  currentDateKey?: string;
}

export const NewTaskInput: React.FC<NewTaskInputProps> = ({
  onAddTask
}) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isNotesFocused, setIsNotesFocused] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    onAddTask(title.trim(), notes.trim() || undefined);
    setTitle('');
    setNotes('');
    // Return focus to title input for rapid task entry
    titleInputRef.current?.focus();
  };

  const handleKeyDownNotes = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to quickly submit from notes field
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 p-2.5 shadow-xl shadow-black/40 space-y-2 transition-all focus-within:border-slate-700/80 focus-within:ring-1 focus-within:ring-indigo-500/20"
    >
      {/* 1. Верхний блок: Сама задача */}
      <div className="flex items-center gap-2">
        <input
          ref={titleInputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Новая задача..."
          className="flex-1 bg-transparent px-2.5 py-1 text-sm font-medium text-white placeholder-slate-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={!title.trim()}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить</span>
        </button>
      </div>

      {/* Разделитель между задачей и комментарием */}
      <div className="border-t border-slate-800/80" />

      {/* 2. Нижний блок: Комментарии / подробности */}
      <div className="flex items-start gap-2 px-1 pt-0.5">
        <MessageSquare className="w-3.5 h-3.5 text-slate-500 mt-1 shrink-0" />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onFocus={() => setIsNotesFocused(true)}
          onBlur={() => setIsNotesFocused(false)}
          onKeyDown={handleKeyDownNotes}
          placeholder="Комментарий или подробности (необязательно)..."
          rows={isNotesFocused || notes ? 2 : 1}
          className="w-full bg-transparent px-1 py-0.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none resize-none leading-relaxed transition-all"
        />
        {notes && (
          <button
            type="button"
            onClick={() => setNotes('')}
            className="p-1 text-slate-500 hover:text-slate-300 transition shrink-0"
            title="Очистить комментарий"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Подсказка о количестве символов при вводе */}
      {notes && (
        <div className="flex items-center justify-end text-[10px] text-slate-500 px-2">
          <span>{notes.length} симв.</span>
        </div>
      )}
    </form>
  );
};
