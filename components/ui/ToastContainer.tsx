import React, { createContext, ReactNode, useContext, useState } from 'react';
import { View } from 'react-native';
import Toast, { ToastProps } from './Toast';

interface ToastContextType {
  showToast: (toast: Omit<ToastProps, 'id' | 'onDismiss'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const generateId = () => `toast-${Date.now()}-${Math.random()}`;

  const showToast = (toast: Omit<ToastProps, 'id' | 'onDismiss'>) => {
    const id = generateId();
    const newToast: ToastProps = {
      ...toast,
      id,
      onDismiss: dismissToast,
    };

    setToasts(prev => [...prev, newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showSuccess = (title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  };

  const showError = (title: string, message?: string) => {
    showToast({ type: 'error', title, message });
  };

  const showInfo = (title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  };

  const showWarning = (title: string, message?: string) => {
    showToast({ type: 'warning', title, message });
  };

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999 }}>
        {toasts.map((toast, index) => (
          <View key={toast.id} style={{ marginTop: index * 80 }}>
            <Toast {...toast} />
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}; 