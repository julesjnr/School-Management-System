export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export type ModalType = 'success' | 'error' | 'warning' | 'info';

export interface AlertOptions {
  title: string;
  message: string;
  type?: ModalType;
  details?: string;
  confirmText?: string;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'primary';
  details?: string;
}

export interface PromptOptions {
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  inputType?: 'text' | 'textarea' | 'number' | 'password';
  required?: boolean;
  confirmText?: string;
  cancelText?: string;
  validate?: (value: string) => string | null;
}

export interface RegistrationCredentials {
  name: string;
  idOrAdmissionNo: string;
  temporaryPasscode: string;
  role?: string;
  department?: string;
  email?: string;
}

export interface LoadingOptions {
  title: string;
  message?: string;
}

export interface NotificationContextType {
  // Toasts
  showToast: (message: string, type?: ToastType, options?: { title?: string; duration?: number }) => void;
  
  // Alert Modals (Success, Error, Warning, Info)
  showAlert: (options: AlertOptions) => Promise<void>;
  showSuccess: (title: string, message: string, details?: string) => Promise<void>;
  showError: (title: string, message: string, details?: string) => Promise<void>;
  showWarning: (title: string, message: string, details?: string) => Promise<void>;
  showInfo: (title: string, message: string, details?: string) => Promise<void>;

  // Confirmation Modal
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;

  // Custom Prompt Form Modal
  showPrompt: (options: PromptOptions) => Promise<string | null>;

  // Loading Dialog
  showLoading: (title: string, message?: string) => () => void;
  withLoading: <T>(fn: () => Promise<T>, title: string, message?: string) => Promise<T>;

  // Registration Credentials Success Modal
  showRegistrationModal: (credentials: RegistrationCredentials) => Promise<void>;
}
