import React, { useCallback, useRef, useState } from 'react';
import { Copy, ClipboardPaste, Trash2, Upload, Eye, EyeOff } from 'lucide-react';
import { useToast } from './Toast.tsx';

export function useCopy() {
  const { showToast } = useToast();
  return useCallback(
    async (text: string, label = 'Copied') => {
      try {
        await navigator.clipboard.writeText(text);
        showToast(label);
      } catch {
        showToast('Clipboard access denied', { type: 'error' });
      }
    },
    [showToast],
  );
}

export function usePaste(set: (s: string) => void) {
  const { showToast } = useToast();
  return useCallback(async () => {
    try {
      set(await navigator.clipboard.readText());
    } catch {
      showToast('Clipboard access denied', { type: 'error' });
    }
  }, [set, showToast]);
}

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">{children}</span>
);

export const IconBtn: React.FC<{
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ title, onClick, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    className="inline-flex items-center justify-center min-h-7 min-w-7 rounded-sm text-mute hover:text-ink hover:bg-canvas-soft transition-colors"
  >
    {children}
  </button>
);

/** Header strip above a pane: title on the left, optional paste/clear/copy on the right. */
export const PaneHeader: React.FC<{
  title: React.ReactNode;
  icon?: React.ReactNode;
  onPaste?: () => void;
  onClear?: () => void;
  copyText?: string;
  extra?: React.ReactNode;
}> = ({ title, icon, onPaste, onClear, copyText, extra }) => {
  const copy = useCopy();
  return (
    <div className="min-h-10 px-3 flex items-center justify-between border-b border-hairline shrink-0">
      <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute flex items-center gap-1.5">
        {icon}
        {title}
      </span>
      <div className="flex items-center gap-1">
        {extra}
        {onPaste && (
          <IconBtn title="Paste" onClick={onPaste}>
            <ClipboardPaste className="w-3.5 h-3.5" />
          </IconBtn>
        )}
        {onClear && (
          <IconBtn title="Clear" onClick={onClear}>
            <Trash2 className="w-3.5 h-3.5" />
          </IconBtn>
        )}
        {copyText !== undefined && (
          <IconBtn title="Copy" onClick={() => copy(copyText)}>
            <Copy className="w-3.5 h-3.5" />
          </IconBtn>
        )}
      </div>
    </div>
  );
};

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  mono = false,
}: {
  value: T;
  options: { id: T; label: React.ReactNode; title?: string }[];
  onChange: (v: T) => void;
  mono?: boolean;
}) {
  return (
    <div className="inline-flex flex-wrap max-w-full rounded-sm border border-hairline bg-canvas p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          title={o.title}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`inline-flex items-center justify-center gap-1.5 min-h-6 px-2.5 rounded-xs text-xs whitespace-nowrap transition-colors ${mono ? 'font-mono' : ''} ${
            value === o.id ? 'bg-primary/15 text-primary' : 'text-mute hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Check: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}> = ({ checked, onChange, children }) => (
  <label className="flex items-center gap-2 cursor-pointer text-xs text-body hover:text-ink">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="accent-primary"
    />
    {children}
  </label>
);

export const Toolbar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="shrink-0 border-b border-hairline px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
    {children}
  </div>
);

const BUTTON_VARIANT = {
  primary: 'border-primary bg-primary text-canvas font-semibold hover:bg-primary-soft hover:border-primary-soft',
  secondary: 'border-hairline bg-canvas-soft text-mute hover:text-ink hover:border-primary/40',
  danger: 'border-hairline bg-canvas-soft text-mute hover:text-red-400 hover:border-red-400/40',
};

/** The app's button. Use `primary` for at most one action per view. */
export const TextBtn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; danger?: boolean }
> = ({ primary, danger, className = '', children, ...props }) => (
  <button
    type="button"
    {...props}
    className={`inline-flex items-center justify-center gap-1.5 min-h-7 px-2.5 rounded-sm border text-xs whitespace-nowrap transition-colors ${
      BUTTON_VARIANT[primary ? 'primary' : danger ? 'danger' : 'secondary']
    } ${className}`}
  >
    {children}
  </button>
);

export const textareaCls =
  'flex-1 w-full resize-none bg-canvas text-ink text-sm font-mono p-4 focus:outline-none placeholder-mute';
export const inputCls =
  'bg-canvas-soft border border-hairline rounded-sm px-2 py-1.5 text-ink text-xs font-mono focus:outline-none focus:border-primary';

/** Masked input for tokens and passwords, with a show/hide toggle. Fills its flex row. */
export const SecretInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { wrapperClassName?: string }
> = ({ wrapperClassName = '', className = '', ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <span className={`flex-1 min-w-0 flex items-center gap-1 ${wrapperClassName}`}>
      <input
        aria-label={props.placeholder}
        {...props}
        type={show ? 'text' : 'password'}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        spellCheck={false}
        className={`${inputCls} flex-1 min-w-0 ${className}`}
      />
      <IconBtn title={show ? 'Hide value' : 'Show value'} onClick={() => setShow((s) => !s)}>
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </IconBtn>
    </span>
  );
};

/** Value row with a copy button: used for multi-format outputs. */
export const CopyRow: React.FC<{ label: string; value: string; dim?: boolean }> = ({
  label,
  value,
  dim,
}) => {
  const copy = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(value, `${label} copied`)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-md border border-hairline bg-canvas-soft hover:border-primary/40 transition-colors text-left group"
    >
      <span className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">
        {label}
      </span>
      <span
        className={`flex-1 min-w-0 break-all font-mono text-sm leading-snug ${dim ? 'text-mute' : 'text-ink'}`}
      >
        {value || '—'}
      </span>
      <Copy className="w-3.5 h-3.5 text-mute [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 shrink-0" />
    </button>
  );
};

/** Scrolling page body that uses the full width (no narrow centered column). */
export const Page: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className="flex-1 min-h-0 overflow-auto">
    <div className={`w-full max-w-[1800px] mx-auto p-5 lg:p-6 ${className}`}>{children}</div>
  </div>
);

/** Bordered card with an optional title strip. */
export const Panel: React.FC<{
  title?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}> = ({ title, extra, children, className = '', bodyClassName = 'p-4' }) => (
  <section className={`rounded-md border border-hairline bg-canvas-soft/40 min-w-0 ${className}`}>
    {title !== undefined && (
      <header className="px-4 min-h-10 flex items-center justify-between gap-3 border-b border-hairline">
        <Label>{title}</Label>
        {extra}
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

/** Big-number tile; click to copy `copy ?? value`. */
export const Stat: React.FC<{ label: string; value: string; hint?: string; copy?: string; tone?: string }> = ({
  label,
  value,
  hint,
  copy: copyValue,
  tone = 'text-ink-strong',
}) => {
  const copy = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(copyValue ?? value, `${label} copied`)}
      className="text-left rounded-md border border-hairline bg-canvas-soft px-4 py-3 hover:border-primary/40 transition-colors min-w-0"
    >
      <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">{label}</div>
      <div className={`mt-1 font-mono text-xl font-semibold tabular-nums truncate ${tone}`}>{value || '—'}</div>
      {hint && <div className="mt-0.5 text-xs text-mute truncate">{hint}</div>}
    </button>
  );
};

/** Responsive auto-fill grid: columns are at least `min` px wide. */
export const AutoGrid: React.FC<{ min?: number; gap?: number; children: React.ReactNode; className?: string }> = ({
  min = 240,
  gap = 12,
  children,
  className = '',
}) => (
  <div className={className} style={{ display: 'grid', gap, gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${min}px), 1fr))` }}>
    {children}
  </div>
);

// ------------------------------------------------------------ file input

const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Read a File as UTF-8 text (BOM stripped). Throws a readable Error when too big. */
export async function readTextFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is ${(file.size / 1048576).toFixed(1)} MB — the limit is 50 MB.`);
  const text = await file.text();
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export type FileHandler = (text: string, file: { name: string; size: number }) => void;

function useFileReader(onFile: FileHandler) {
  const { showToast } = useToast();
  return useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      try {
        onFile(await readTextFile(file), { name: file.name, size: file.size });
      } catch (e) {
        showToast((e as Error).message || 'Could not read that file', { type: 'error' });
      }
    },
    [onFile, showToast],
  );
}

/** Button that opens the OS file picker. */
export const FileButton: React.FC<{ onFile: FileHandler; accept?: string; label?: string; compact?: boolean }> = ({
  onFile,
  accept = '.csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain',
  label = 'Upload file',
  compact = false,
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const read = useFileReader(onFile);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        data-testid="file-input"
        onChange={(e) => {
          void read(e.target.files?.[0]);
          e.target.value = ''; // allow re-selecting the same file
        }}
      />
      {compact ? (
        <IconBtn title={label} onClick={() => ref.current?.click()}>
          <Upload className="w-3.5 h-3.5" />
        </IconBtn>
      ) : (
        <TextBtn onClick={() => ref.current?.click()}>
          <Upload className="w-3.5 h-3.5" />
          {label}
        </TextBtn>
      )}
    </>
  );
};

/** Wrap an area so a file can be dropped anywhere on it. */
export const DropZone: React.FC<{ onFile: FileHandler; children: React.ReactNode; className?: string; hint?: string }> = ({
  onFile,
  children,
  className = '',
  hint = 'Drop file to load',
}) => {
  const [over, setOver] = useState(false);
  const read = useFileReader(onFile);
  return (
    <div
      className={`relative ${className}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setOver(false);
        void read(e.dataTransfer.files[0]);
      }}
    >
      {children}
      {over && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-sm border-2 border-dashed border-primary bg-canvas/85 pointer-events-none">
          <span className="flex items-center gap-2 text-sm font-medium text-primary">
            <Upload className="w-4 h-4" /> {hint}
          </span>
        </div>
      )}
    </div>
  );
};

export const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
