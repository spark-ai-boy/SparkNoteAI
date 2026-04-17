// Toast Hook

import { useToastStore } from '../stores/toastStore';

export const useToast = () => {
  const addToast = useToastStore((state) => state.addToast);
  const removeToast = useToastStore((state) => state.removeToast);
  const showSuccess = useToastStore((state) => state.showSuccess);
  const showError = useToastStore((state) => state.showError);
  const showWarning = useToastStore((state) => state.showWarning);
  const showInfo = useToastStore((state) => state.showInfo);
  const clearAll = useToastStore((state) => state.clearAll);

  return {
    addToast,
    removeToast,
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    clearAll,
  };
};
