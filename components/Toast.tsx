import React, { useState, createContext, useContext, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

// --- Toast System ---
type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: AlertTriangle,
  info: Info,
};

const Toast: React.FC<ToastMessage & { onDismiss: () => void; }> = ({ message, type, onDismiss }) => {
  const Icon = ICONS[type];
  const variant = type === 'error' ? 'destructive' : 'default';

  return (
    <Alert variant={variant} className="animate-fade-in-up shadow-lg group">
      <Icon className="h-5 w-5" />
      <AlertDescription>{message}</AlertDescription>
       <button
        onClick={onDismiss}
        className="absolute top-2 right-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:ring-2 group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </button>
    </Alert>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; removeToast: (id: string) => void; }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] w-full max-w-xs space-y-3">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = uuidv4();
    setToasts(currentToasts => [...currentToasts, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};
// --- End Toast System ---