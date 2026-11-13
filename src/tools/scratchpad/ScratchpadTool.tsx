import React from 'react';
import { Plus, X } from 'lucide-react';
import { IconBtn, PaneHeader, textareaCls } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

interface Note {
  id: string;
  title: string;
  body: string;
}
const newNote = (n: number): Note => ({ id: Math.random().toString(36).slice(2, 9), title: `Note ${n}`, body: '' });

export const ScratchpadTool: React.FC = () => {
  const [notes, setNotes] = usePersistentState<Note[]>('scratchpad', 'notes', () => [newNote(1)]);
  const [activeId, setActiveId] = usePersistentState<string>('scratchpad', 'active', '');
  const active = notes.find((n) => n.id === activeId) ?? notes[0]!;

  const patch = (p: Partial<Note>) =>
    setNotes((ns) => ns.map((n) => (n.id === active.id ? { ...n, ...p } : n)));
  const add = () => {
    const n = newNote(notes.length + 1);
    setNotes([...notes, n]);
    setActiveId(n.id);
  };
  const remove = (id: string) => {
    const rest = notes.filter((n) => n.id !== id);
    setNotes(rest.length ? rest : [newNote(1)]);
    if (id === active.id) setActiveId(rest[0]?.id ?? '');
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <div className="shrink-0 border-b border-hairline flex items-center overflow-x-auto">
        {notes.map((n) => (
          <div
            key={n.id}
            className={`group flex items-center gap-1 pl-3 pr-1.5 py-2 border-r border-hairline text-xs cursor-pointer shrink-0 ${
              n.id === active.id ? 'bg-canvas-soft text-primary' : 'text-mute hover:text-ink'
            }`}
            onClick={() => setActiveId(n.id)}
          >
            <span className="max-w-[140px] truncate">{n.title || 'Untitled'}</span>
            <button
              type="button"
              title="Delete note"
              onClick={(e) => {
                e.stopPropagation();
                if (!n.body || window.confirm(`Delete "${n.title}"?`)) remove(n.id);
              }}
              className="p-0.5 rounded-xs opacity-0 group-hover:opacity-100 hover:text-red-400"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <IconBtn title="New note" onClick={add}>
          <Plus className="w-3.5 h-3.5" />
        </IconBtn>
      </div>
      <PaneHeader
        title={
          <input
            value={active.title}
            onChange={(e) => patch({ title: e.target.value })}
            className="bg-transparent text-ink text-xs normal-case tracking-normal font-medium focus:outline-none w-64"
          />
        }
        copyText={active.body}
        onClear={() => patch({ body: '' })}
        extra={<span className="text-[11px] text-mute font-mono mr-2">{active.body.length} chars · saved locally</span>}
      />
      <textarea
        autoFocus
        value={active.body}
        onChange={(e) => patch({ body: e.target.value })}
        spellCheck={false}
        placeholder="Jot anything down — it stays in this browser."
        className={textareaCls}
      />
    </div>
  );
};
