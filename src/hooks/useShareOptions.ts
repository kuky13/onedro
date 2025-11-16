import React, { useState, useCallback, useMemo } from 'react';
import { MessageCircle, Share, Mail, Copy, Smartphone } from 'lucide-react';
import { generateWhatsAppMessage, shareViaWhatsApp } from '@/utils/whatsappUtils';
import { useToast } from '@/hooks/useToast';
import { ShareOption } from '@/components/ui/share-selector';

export interface ShareData {
  title: string;
  text: string;
  url?: string;
}

export interface UseShareOptionsProps {
  data: any; // Budget data
  type: 'budget' | 'service-order';
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useShareOptions = ({
  data,
  type,
  onSuccess,
  onError
}: UseShareOptionsProps) => {
  const { showSuccess, showError } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  // Detect iOS device
  const isIOS = useMemo(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }, []);

  // Detect if WhatsApp Business is available
  const hasWhatsAppBusiness = useMemo(() => {
    // On iOS, we can try to detect WhatsApp Business
    if (isIOS) {
      return true; // Assume available on iOS
    }
    // On Android/Web, we'll use regular WhatsApp
    return true;
  }, [isIOS]);

  // Generate share content based on data type
  const generateShareContent = useCallback((): ShareData => {
    if (type === 'budget') {
      const message = generateWhatsAppMessage({
        ...data,
        service_specification: data.service_specification || data.part_type
      });
      
      return {
        title: `Orçamento - ${data.client_name || 'Cliente'}`,
        text: message,
        url: window.location.origin
      };
    }
    
    // For service orders or other types
    return {
      title: `Compartilhamento - ${data.client_name || 'Item'}`,
      text: `Confira os detalhes: ${data.description || 'Informações disponíveis'}`,
      url: window.location.origin
    };
  }, [data, type]);

  // WhatsApp Business share function
  const shareWhatsAppBusiness = useCallback(async () => {
    try {
      const content = generateShareContent();
      
      if (isIOS) {
        // Try WhatsApp Business first on iOS
        const whatsappBusinessUrl = `whatsapp://send?text=${encodeURIComponent(content.text)}`;
        
        // Try to open WhatsApp Business
        const link = document.createElement('a');
        link.href = whatsappBusinessUrl;
        link.click();
        
        // Fallback to regular WhatsApp after a delay
        setTimeout(() => {
          shareViaWhatsApp(content.text);
        }, 1000);
      } else {
        // Use regular WhatsApp on other platforms
        shareViaWhatsApp(content.text);
      }
      
      showSuccess({
        title: "Redirecionando...",
        description: "Você será redirecionado para o WhatsApp Business para compartilhar."
      });
      
      onSuccess?.();
    } catch (error) {
      const err = error as Error;
      showError({
        title: "Erro ao compartilhar",
        description: "Não foi possível abrir o WhatsApp Business."
      });
      onError?.(err);
    }
  }, [generateShareContent, isIOS, showSuccess, showError, onSuccess, onError]);

  // Regular WhatsApp share function
  const shareWhatsApp = useCallback(async () => {
    try {
      const content = generateShareContent();
      shareViaWhatsApp(content.text);
      
      showSuccess({
        title: "Redirecionando...",
        description: "Você será redirecionado para o WhatsApp para compartilhar."
      });
      
      onSuccess?.();
    } catch (error) {
      const err = error as Error;
      showError({
        title: "Erro ao compartilhar",
        description: "Não foi possível abrir o WhatsApp."
      });
      onError?.(err);
    }
  }, [generateShareContent, showSuccess, showError, onSuccess, onError]);

  // Native share function (iOS/Android)
  const shareNative = useCallback(async () => {
    try {
      if (!navigator.share) {
        throw new Error('Web Share API não suportada');
      }
      
      const content = generateShareContent();
      
      // Check if we can share - some browsers require user activation
      if (typeof navigator.canShare === 'function' && !navigator.canShare({ text: content.text })) {
        throw new Error('Compartilhamento não disponível neste momento');
      }
      
      await navigator.share({
        title: content.title,
        text: content.text,
        url: content.url
      });
      
      showSuccess({
        title: "Compartilhado com sucesso!",
        description: "O conteúdo foi compartilhado."
      });
      
      onSuccess?.();
    } catch (error) {
      const err = error as Error;
      // AbortError occurs when user cancels the share dialog
      if (err.name === 'AbortError') {
        return; // Don't show error for user cancellation
      }
      
      // For permission denied errors, fallback to copy to clipboard
      if (err.message.includes('Permission denied') || err.name === 'NotAllowedError') {
        try {
          const content = generateShareContent();
          await navigator.clipboard.writeText(content.text);
          showSuccess({
            title: "Copiado para área de transferência",
            description: "O compartilhamento nativo não está disponível. O conteúdo foi copiado."
          });
          onSuccess?.();
        } catch (clipboardError) {
          showError({
            title: "Erro ao compartilhar",
            description: "Compartilhamento nativo não disponível e não foi possível copiar o texto."
          });
          onError?.(err);
        }
      } else {
        showError({
          title: "Erro ao compartilhar",
          description: "Não foi possível usar o compartilhamento nativo."
        });
        onError?.(err);
      }
    }
  }, [generateShareContent, showSuccess, showError, onSuccess, onError]);

  // Email share function
  const shareEmail = useCallback(async () => {
    try {
      const content = generateShareContent();
      const subject = encodeURIComponent(content.title);
      const body = encodeURIComponent(content.text);
      
      const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
      window.open(mailtoUrl, '_blank');
      
      showSuccess({
        title: "Abrindo cliente de email...",
        description: "O email será preparado com o conteúdo do orçamento."
      });
      
      onSuccess?.();
    } catch (error) {
      const err = error as Error;
      showError({
        title: "Erro ao compartilhar",
        description: "Não foi possível abrir o cliente de email."
      });
      onError?.(err);
    }
  }, [generateShareContent, showSuccess, showError, onSuccess, onError]);

  // Copy to clipboard function
  const copyToClipboard = useCallback(async () => {
    try {
      const content = generateShareContent();
      await navigator.clipboard.writeText(content.text);
      
      showSuccess({
        title: "Copiado!",
        description: "O conteúdo foi copiado para a área de transferência."
      });
      
      onSuccess?.();
    } catch (error) {
      const err = error as Error;
      showError({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o conteúdo."
      });
      onError?.(err);
    }
  }, [generateShareContent, showSuccess, showError, onSuccess, onError]);

  // Generate share options based on platform and availability
  const shareOptions = useMemo((): ShareOption[] => {
    const options: ShareOption[] = [];

    // WhatsApp Business (preferred on iOS)
    if (hasWhatsAppBusiness) {
      options.push({
        id: 'whatsapp-business',
        name: 'WhatsApp Business',
        icon: React.createElement(MessageCircle, { className: "h-5 w-5" }),
        color: '#25D366',
        action: shareWhatsAppBusiness,
        description: 'Compartilhar via WhatsApp Business',
        isPreferred: true,
        isAvailable: true
      });
    }

    // Regular WhatsApp
    options.push({
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: React.createElement(MessageCircle, { className: "h-5 w-5" }),
      color: '#25D366',
      action: shareWhatsApp,
      description: 'Compartilhar via WhatsApp',
      isPreferred: !hasWhatsAppBusiness,
      isAvailable: true
    });

    // Native share (iOS/Android)
    if (navigator.share) {
      options.push({
        id: 'native',
        name: isIOS ? 'Compartilhar (iOS)' : 'Compartilhar',
        icon: React.createElement(Share, { className: "h-5 w-5" }),
        color: '#007AFF',
        action: shareNative,
        description: 'Usar o menu de compartilhamento do sistema',
        isPreferred: false,
        isAvailable: true
      });
    }

    // Email
    options.push({
      id: 'email',
      name: 'Email',
      icon: React.createElement(Mail, { className: "h-5 w-5" }),
      color: '#EA4335',
      action: shareEmail,
      description: 'Enviar por email',
      isPreferred: false,
      isAvailable: true
    });

    // Copy to clipboard
    if (navigator.clipboard) {
      options.push({
        id: 'copy',
        name: 'Copiar',
        icon: React.createElement(Copy, { className: "h-5 w-5" }),
        color: '#6B7280',
        action: copyToClipboard,
        description: 'Copiar para área de transferência',
        isPreferred: false,
        isAvailable: true
      });
    }

    return options;
  }, [hasWhatsAppBusiness, isIOS, shareWhatsAppBusiness, shareWhatsApp, shareNative, shareEmail, copyToClipboard]);

  return {
    shareOptions,
    isSharing,
    setIsSharing,
    isIOS,
    hasWhatsAppBusiness,
    generateShareContent
  };
};

export default useShareOptions;