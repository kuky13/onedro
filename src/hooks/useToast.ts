
// Consolidated toast hook - replaces both useToast and useEnhancedToast
import { toast } from "sonner";

export interface EnhancedToastOptions {
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  style?: React.CSSProperties;
}

interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export const useToast = () => {
  // Custom toast function that handles objects correctly
  const customToast = (messageOrOptions: string | ToastOptions | EnhancedToastOptions, options?: any) => {
    if (typeof messageOrOptions === 'string') {
      // If it's a string, use the original toast function
      return toast(messageOrOptions, options);
    } else {
      // If it's an object, handle it properly
      const opts = messageOrOptions as ToastOptions | EnhancedToastOptions;

      const isDestructive = 'variant' in opts && opts.variant === 'destructive';

      if (isDestructive) {
        return toast.error(opts.title, {
          ...(opts.description ? { description: opts.description } : {}),
          duration: (opts as EnhancedToastOptions).duration || 4000,
          className: (opts as any).className,
        });
      }

      // Default
      return toast(opts.title, {
        ...(opts.description ? { description: opts.description } : {}),
        duration: (opts as EnhancedToastOptions).duration || 4000,
        className: (opts as any).className,
      });
    }
  };

  const showSuccess = (options: EnhancedToastOptions | Omit<ToastOptions, 'variant'>) => {
    // Dismiss all existing toasts before showing new one
    toast.dismiss();
    
    // Validação de tipo mais robusta
    if (typeof options !== 'object' || options === null) {
      console.error('showSuccess: options deve ser um objeto');
      return;
    }
    
    if (typeof options === 'object' && ('duration' in options || 'action' in options)) {
      const enhancedOptions = options as EnhancedToastOptions;
      const toastOpts: any = {
        ...(enhancedOptions.description ? { description: enhancedOptions.description } : {}),
        duration: enhancedOptions.duration || 4000,
        ...(enhancedOptions.action
          ? {
              action: {
                label: enhancedOptions.action.label,
                onClick: enhancedOptions.action.onClick,
              },
            }
          : {}),
        ...(enhancedOptions.onDismiss ? { onDismiss: enhancedOptions.onDismiss as any } : {}),
        ...(enhancedOptions.style ? { style: enhancedOptions.style } : {}),
      };

      toast.success(enhancedOptions.title, toastOpts);
    } else {
      const simpleOptions = options as Omit<ToastOptions, 'variant'>;
      toast.success(simpleOptions.title, {
        description: simpleOptions.description,
      });
    }
  };

  const showError = (options: EnhancedToastOptions | Omit<ToastOptions, 'variant'>) => {
    // Dismiss all existing toasts before showing new one
    toast.dismiss();
    
    // Validação de tipo mais robusta
    if (typeof options !== 'object' || options === null) {
      console.error('showError: options deve ser um objeto');
      return;
    }
    
    if (typeof options === 'object' && ('duration' in options || 'action' in options)) {
      const enhancedOptions = options as EnhancedToastOptions;
      const toastOpts: any = {
        ...(enhancedOptions.description ? { description: enhancedOptions.description } : {}),
        duration: enhancedOptions.duration || 6000,
        ...(enhancedOptions.action
          ? {
              action: {
                label: enhancedOptions.action.label,
                onClick: enhancedOptions.action.onClick,
              },
            }
          : {}),
        ...(enhancedOptions.onDismiss ? { onDismiss: enhancedOptions.onDismiss as any } : {}),
        ...(enhancedOptions.style ? { style: enhancedOptions.style } : {}),
      };

      toast.error(enhancedOptions.title, toastOpts);
    } else {
      const simpleOptions = options as Omit<ToastOptions, 'variant'>;
      toast.error(simpleOptions.title, {
        description: simpleOptions.description,
      });
    }
  };

  const showInfo = (options: EnhancedToastOptions | Omit<ToastOptions, 'variant'>) => {
    // Dismiss all existing toasts before showing new one
    toast.dismiss();
    
    // Validação de tipo mais robusta
    if (typeof options !== 'object' || options === null) {
      console.error('showInfo: options deve ser um objeto');
      return;
    }
    
    if (typeof options === 'object' && ('duration' in options || 'action' in options)) {
      const enhancedOptions = options as EnhancedToastOptions;
      const toastOpts: any = {
        ...(enhancedOptions.description ? { description: enhancedOptions.description } : {}),
        duration: enhancedOptions.duration || 4000,
        ...(enhancedOptions.action
          ? {
              action: {
                label: enhancedOptions.action.label,
                onClick: enhancedOptions.action.onClick,
              },
            }
          : {}),
        ...(enhancedOptions.onDismiss ? { onDismiss: enhancedOptions.onDismiss as any } : {}),
        ...(enhancedOptions.style ? { style: enhancedOptions.style } : {}),
      };

      toast.info(enhancedOptions.title, toastOpts);
    } else {
      const simpleOptions = options as Omit<ToastOptions, 'variant'>;
      toast.info(simpleOptions.title, {
        description: simpleOptions.description,
      });
    }
  };

  const showWarning = (options: EnhancedToastOptions | Omit<ToastOptions, 'variant'>) => {
    // Dismiss all existing toasts before showing new one
    toast.dismiss();
    
    // Validação de tipo mais robusta
    if (typeof options !== 'object' || options === null) {
      console.error('showWarning: options deve ser um objeto');
      return;
    }
    
    if (typeof options === 'object' && ('duration' in options || 'action' in options)) {
      const enhancedOptions = options as EnhancedToastOptions;
      const toastOpts: any = {
        ...(enhancedOptions.description ? { description: enhancedOptions.description } : {}),
        duration: enhancedOptions.duration || 5000,
        ...(enhancedOptions.action
          ? {
              action: {
                label: enhancedOptions.action.label,
                onClick: enhancedOptions.action.onClick,
              },
            }
          : {}),
        ...(enhancedOptions.onDismiss ? { onDismiss: enhancedOptions.onDismiss as any } : {}),
        ...(enhancedOptions.style ? { style: enhancedOptions.style } : {}),
      };

      toast.warning(enhancedOptions.title, toastOpts);
    } else {
      const simpleOptions = options as Omit<ToastOptions, 'variant'>;
      toast.warning(simpleOptions.title, {
        description: simpleOptions.description,
      });
    }
  };

  const showLoading = (options: EnhancedToastOptions | Omit<ToastOptions, 'variant'>) => {
    // Dismiss all existing toasts before showing new one
    toast.dismiss();
    
    // Validação de tipo mais robusta
    if (typeof options !== 'object' || options === null) {
      console.error('showLoading: options deve ser um objeto');
      return;
    }
    
    if (typeof options === 'object' && ('duration' in options || 'action' in options)) {
      const enhancedOptions = options as EnhancedToastOptions;
      const toastOpts: any = {
        ...(enhancedOptions.description ? { description: enhancedOptions.description } : {}),
        duration: enhancedOptions.duration || Infinity,
        ...(enhancedOptions.action
          ? {
              action: {
                label: enhancedOptions.action.label,
                onClick: enhancedOptions.action.onClick,
              },
            }
          : {}),
        ...(enhancedOptions.onDismiss ? { onDismiss: enhancedOptions.onDismiss as any } : {}),
        ...(enhancedOptions.style ? { style: enhancedOptions.style } : {}),
      };

      return toast.loading(enhancedOptions.title, toastOpts);
    } else {
      const simpleOptions = options as Omit<ToastOptions, 'variant'>;
      return toast.loading(simpleOptions.title, {
        description: simpleOptions.description,
      });
    }
  };

  return {
    toast: customToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showLoading,
  };
};

// Legacy compatibility
export const useEnhancedToast = useToast;
