import React, { createContext, useContext, useState, useCallback } from 'react';
import { Check, Copy, AlertCircle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
  code?: string;
}

interface ToastContextType {
  showToast: (message: string, options?: { type?: 'success' | 'info' | 'error'; code?: string }) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, options?: { type?: 'success' | 'info' | 'error'; code?: string }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastItem = {
      id,
      message,
      type: options?.type ?? 'success',
      code: options?.code,
    };
    setToasts((prev) => [...prev.slice(-3), item]); // Keep max 4 toasts
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 bg-canvas-soft border border-hairline px-4 py-3 rounded-sm shadow-modal-stack text-sm animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-md"
          >
            {toast.type === 'success' && <Check className="w-4 h-4 text-primary shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-primary-soft shrink-0" />}

            <div className="flex-1 truncate">
              <span className="text-ink font-medium">{toast.message}</span>
              {toast.code && (
                <div className="mt-1 font-mono text-xs text-primary bg-canvas px-2 py-0.5 rounded-xs border border-hairline truncate">
                  {toast.code}
                </div>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-mute hover:text-ink p-1 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
