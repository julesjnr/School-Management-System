import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  ToastItem,
  ToastType,
  AlertOptions,
  ConfirmOptions,
  PromptOptions,
  RegistrationCredentials,
  LoadingOptions,
  NotificationContextType,
} from './types';
import { ToastContainer } from './ToastContainer';
import { AlertModal } from './AlertModal';
import { ConfirmationModal } from './ConfirmationModal';
import { PromptModal } from './PromptModal';
import { LoadingModal } from './LoadingModal';
import { RegistrationSuccessModal } from './RegistrationSuccessModal';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [alertState, setAlertState] = useState<{
    options: AlertOptions;
    resolve: () => void;
  } | null>(null);

  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (res: boolean) => void;
  } | null>(null);

  const [promptState, setPromptState] = useState<{
    options: PromptOptions;
    resolve: (res: string | null) => void;
  } | null>(null);

  const [loadingState, setLoadingState] = useState<LoadingOptions | null>(null);

  const [registrationState, setRegistrationState] = useState<{
    credentials: RegistrationCredentials;
    resolve: () => void;
  } | null>(null);

  // Toast handler
  const showToast = useCallback(
    (message: string, type: ToastType = 'info', options?: { title?: string; duration?: number }) => {
      const id = 'toast_' + Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          type,
          title: options?.title,
          duration: options?.duration || 4000,
        },
      ]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Alert Modals
  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      setAlertState({ options, resolve });
    });
  }, []);

  const closeAlert = useCallback(() => {
    if (alertState) {
      alertState.resolve();
      setAlertState(null);
    }
  }, [alertState]);

  const showSuccess = useCallback(
    (title: string, message: string, details?: string) => {
      return showAlert({ title, message, type: 'success', details });
    },
    [showAlert]
  );

  const showError = useCallback(
    (title: string, message: string, details?: string) => {
      return showAlert({ title, message, type: 'error', details });
    },
    [showAlert]
  );

  const showWarning = useCallback(
    (title: string, message: string, details?: string) => {
      return showAlert({ title, message, type: 'warning', details });
    },
    [showAlert]
  );

  const showInfo = useCallback(
    (title: string, message: string, details?: string) => {
      return showAlert({ title, message, type: 'info', details });
    },
    [showAlert]
  );

  // Confirm Modal
  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirmAction = useCallback(() => {
    if (confirmState) {
      confirmState.resolve(true);
      setConfirmState(null);
    }
  }, [confirmState]);

  const handleCancelConfirm = useCallback(() => {
    if (confirmState) {
      confirmState.resolve(false);
      setConfirmState(null);
    }
  }, [confirmState]);

  // Prompt Modal
  const showPrompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise<string | null>((resolve) => {
      setPromptState({ options, resolve });
    });
  }, []);

  const handleSubmitPrompt = useCallback(
    (val: string) => {
      if (promptState) {
        promptState.resolve(val);
        setPromptState(null);
      }
    },
    [promptState]
  );

  const handleCancelPrompt = useCallback(() => {
    if (promptState) {
      promptState.resolve(null);
      setPromptState(null);
    }
  }, [promptState]);

  // Loading Modal
  const showLoading = useCallback((title: string, message?: string) => {
    setLoadingState({ title, message });
    return () => setLoadingState(null);
  }, []);

  const withLoading = useCallback(
    async <T,>(fn: () => Promise<T>, title: string, message?: string): Promise<T> => {
      const hide = showLoading(title, message);
      try {
        return await fn();
      } finally {
        hide();
      }
    },
    [showLoading]
  );

  // Registration Modal
  const showRegistrationModal = useCallback((credentials: RegistrationCredentials): Promise<void> => {
    return new Promise<void>((resolve) => {
      setRegistrationState({ credentials, resolve });
    });
  }, []);

  const closeRegistrationModal = useCallback(() => {
    if (registrationState) {
      registrationState.resolve();
      setRegistrationState(null);
    }
  }, [registrationState]);

  return (
    <NotificationContext.Provider
      value={{
        showToast,
        showAlert,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showConfirm,
        showPrompt,
        showLoading,
        withLoading,
        showRegistrationModal,
      }}
    >
      {children}

      {/* Render all active notification components */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <AlertModal options={alertState?.options || null} onClose={closeAlert} />

      <ConfirmationModal
        options={confirmState?.options || null}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelConfirm}
      />

      <PromptModal
        options={promptState?.options || null}
        onSubmit={handleSubmitPrompt}
        onCancel={handleCancelPrompt}
      />

      <LoadingModal options={loadingState} />

      <RegistrationSuccessModal
        credentials={registrationState?.credentials || null}
        onClose={closeRegistrationModal}
        onShowToast={(msg, type) => showToast(msg, type)}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
