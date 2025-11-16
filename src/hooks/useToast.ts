
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
      
      if (opts.variant === 'destructive') {
        return toast.error(opts.title, {
          description: opts.description,
          duration: (opts as EnhancedToastOptions).duration || 4000,
          className: (opts as any).className,
        });
      } else {
        // Default to info toast for non-destructive variants
        return toast(opts.title, {
          description: opts.description,
          duration: (opts as EnhancedToastOptions).duration || 4000,
          className: (opts as any).className,
        });
      }
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
      toast.success(enhancedOptions.title, {
        description: enhancedOptions.description,
        duration: enhancedOptions.duration || 4000,
        action: enhancedOptions.action ? {
          label: enhancedOptions.action.label,
          onClick: enhancedOptions.action.onClick,
        } : undefined,
        onDismiss: enhancedOptions.onDismiss,
        style: enhancedOptions.style,
      });
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
      // Toast error logged
      toast.error(enhancedOptions.title, {
        description: enhancedOptions.description,
        duration: enhancedOptions.duration || 6000,
        action: enhancedOptions.action ? {
          label: enhancedOptions.action.label,
          onClick: enhancedOptions.action.onClick,
        } : undefined,
        onDismiss: enhancedOptions.onDismiss,
        style: enhancedOptions.style,
      });
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
      toast.info(enhancedOptions.title, {
        description: enhancedOptions.description,
        duration: enhancedOptions.duration || 4000,
        action: enhancedOptions.action ? {
          label: enhancedOptions.action.label,
          onClick: enhancedOptions.action.onClick,
        } : undefined,
        onDismiss: enhancedOptions.onDismiss,
        style: enhancedOptions.style,
      });
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
      toast.warning(enhancedOptions.title, {
        description: enhancedOptions.description,
        duration: enhancedOptions.duration || 5000,
        action: enhancedOptions.action ? {
          label: enhancedOptions.action.label,
          onClick: enhancedOptions.action.onClick,
        } : undefined,
        onDismiss: enhancedOptions.onDismiss,
        style: enhancedOptions.style,
      });
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
      return toast.loading(enhancedOptions.title, {
        description: enhancedOptions.description,
        duration: enhancedOptions.duration || Infinity,
        action: enhancedOptions.action ? {
          label: enhancedOptions.action.label,
          onClick: enhancedOptions.action.onClick,
        } : undefined,
        onDismiss: enhancedOptions.onDismiss,
        style: enhancedOptions.style,
      });
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
