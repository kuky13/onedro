import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShareTokenData {
  share_token: string;
  share_url: string;
  expires_at: string;
}

export interface ServiceOrderShareData {
  id: string;
  formatted_id: string;
  sequential_number: number | null;
  device_type: string;
  device_model: string;
  reported_issue: string;
  status: string;
  created_at: string;
  updated_at: string;
  estimated_completion?: string;
  total_price?: number;
  is_paid?: boolean;
  customer_notes?: string;
  imei_serial?: string;
}

export interface CompanyInfo {
  name: string;
  logo_url: string | null;
  address: string | null;
  whatsapp_phone: string | null;
}

export function useServiceOrderShare() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const generateShareToken = async (serviceOrderId: string): Promise<ShareTokenData | null> => {
    try {
      setIsGenerating(true);
      
      // Obter URL base dinâmica baseada no ambiente
      const baseUrl = window.location.origin;
      
      const { data, error } = await supabase
        .rpc('generate_service_order_share_token', {
          p_service_order_id: serviceOrderId,
          p_base_url: baseUrl
        });

      if (error) {
        console.error('Erro ao gerar token de compartilhamento:', error);
        toast.error('Erro ao gerar link de compartilhamento: ' + error.message);
        return null;
      }

      if (!data || data.length === 0) {
        toast.error('Não foi possível gerar o link de compartilhamento');
        return null;
      }

      const shareData = data[0] as ShareTokenData;
      toast.success('Link de compartilhamento gerado com sucesso!');
      
      return shareData;
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      toast.error('Erro inesperado ao gerar link');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const getServiceOrderByToken = async (shareToken: string): Promise<ServiceOrderShareData | null> => {
    try {
      // Starting service order search with token
      
      const { data, error } = await supabase
        .rpc('get_service_order_by_share_token', {
          p_share_token: shareToken
        });

      if (error) {
        console.error('❌ Erro ao buscar ordem de serviço:', error);
        throw new Error(`Erro ao buscar ordem de serviço: ${error.message}`);
      }

      if (!data || data.length === 0) {
        // No data returned from RPC
        throw new Error('Token de compartilhamento inválido ou expirado');
      }

      // Service order found
      return data[0] as ServiceOrderShareData;
    } catch (error) {
      console.error('💥 Erro geral ao buscar ordem de serviço:', error);
      throw error;
    }
  };

  const getCompanyInfoByToken = async (shareToken: string): Promise<CompanyInfo | null> => {
    try {
      // Fetching company information
      const { data, error } = await supabase
        .rpc('get_company_info_by_share_token', {
          p_share_token: shareToken
        });

      // Company info RPC response

      if (error) {
        console.error('❌ Erro ao buscar informações da empresa:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Company information found
      return data[0] as CompanyInfo;
    } catch (error) {
      console.error('💥 Erro geral ao buscar informações da empresa:', error);
      return null;
    }
  };

  const loadShareData = useCallback(async (shareToken: string): Promise<{ serviceOrder: ServiceOrderShareData | null; companyInfo: CompanyInfo | null }> => {
    try {
      setIsLoading(true);
      
      // Executa ambas as chamadas em paralelo
      const [serviceOrderData, companyInfoData] = await Promise.all([
        getServiceOrderByToken(shareToken),
        getCompanyInfoByToken(shareToken)
      ]);

      return {
        serviceOrder: serviceOrderData,
        companyInfo: companyInfoData
      };
    } catch (error) {
      console.error('💥 Erro ao carregar dados de compartilhamento:', error);
      return {
        serviceOrder: null,
        companyInfo: null
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const copyToClipboard = async (text: string, description?: string): Promise<boolean> => {
    // Detecção mais precisa de navegadores
    const userAgent = navigator.userAgent;
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent) && !/Chromium/.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // Para iOS, verificar se estamos em contexto seguro e com interação do usuário
    if (isIOS) {
      // Verificar permissões do clipboard no iOS
      if (navigator.permissions) {
        try {
            const permission = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
            if (permission.state === 'denied') {
              return await lastResortCopy(text, isMobile, isIOS, description);
            }
          } catch (error) {
            // Permissões não suportadas, continuar com tentativas
          }
        }

        // Estratégia 1: Tentar API moderna primeiro no iOS (funciona melhor em contexto de interação)
        if (navigator.clipboard && window.isSecureContext) {
          try {
            await navigator.clipboard.writeText(text);
            toast.success(description ? `${description} copiado!` : 'Link copiado!');
            return true;
          } catch (error) {
            console.log('iOS clipboard API falhou, tentando execCommand:', error);
          }
        }

        // Estratégia 2: Método Safari/iOS otimizado
        const success = await safariCopyMethod(text, description);
        if (success) return true;

        // Estratégia 3: Fallback para iOS
        return await lastResortCopy(text, isMobile, isIOS, description);
    }
    
    // Para outros navegadores, manter lógica original
    // Estratégia 1: Para Safari, usar execCommand como método primário
    if (isSafari) {
      const success = await safariCopyMethod(text, description);
      if (success) return true;
    }
    
    // Estratégia 2: Tentar API moderna do clipboard
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(description ? `${description} copiado!` : 'Link copiado!');
        return true;
      } catch (error) {
        // Falha silenciosa, tenta próxima estratégia
      }
    }
    
    // Estratégia 3: Fallback universal
    const success = await universalCopyMethod(text, description);
    if (success) return true;
    
    // Estratégia 4: Último recurso - cópia manual silenciosa
    return await lastResortCopy(text, isMobile, isIOS, description);
  };

  const safariCopyMethod = async (text: string, description?: string): Promise<boolean> => {
    try {
      // Método otimizado para Safari
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Posicionamento que funciona melhor no Safari
      textArea.style.position = 'absolute';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      textArea.style.zIndex = '-1';
      textArea.setAttribute('readonly', '');
      
      document.body.appendChild(textArea);
      
      // Foco e seleção otimizados para Safari
      textArea.focus();
      textArea.setSelectionRange(0, text.length);
      
      // Executa comando de cópia
      const successful = document.execCommand('copy');
      
      // Limpeza imediata
      document.body.removeChild(textArea);
      
      if (successful) {
        toast.success(description ? `${description} copiado!` : 'Link copiado!');
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  const universalCopyMethod = async (text: string, description?: string): Promise<boolean> => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Configuração universal
      Object.assign(textArea.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '2em',
        height: '2em',
        padding: '0',
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
        background: 'transparent',
        fontSize: '16px', // Evita zoom no iOS
        opacity: '0'
      });
      
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      
      // Seleção robusta
      textArea.select();
      textArea.setSelectionRange(0, 99999);
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        toast.success(description ? `${description} copiado!` : 'Link copiado!');
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  const lastResortCopy = async (text: string, isMobile: boolean, isIOS: boolean, description?: string): Promise<boolean> => {
    try {
      if (isMobile) {
        if (isIOS) {
          // Para iOS, cria um elemento visível temporariamente
          // Criar overlay de fundo
          const overlay = document.createElement('div');
          overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            backdrop-filter: blur(2px);
          `;
          
          const container = document.createElement('div');
          container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 90%;
            min-width: 300px;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          `;
          
          const title = document.createElement('h3');
          title.textContent = 'Copiar Link';
          title.style.cssText = `
            margin: 0 0 16px 0;
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
          `;
          
          const instruction = document.createElement('p');
          instruction.textContent = isIOS ? 'Toque e segure no campo abaixo, depois selecione "Copiar":' : 'Selecione e copie o link abaixo:';
          instruction.style.cssText = `
            margin: 0 0 16px 0;
            font-size: 14px;
            color: #666;
            line-height: 1.4;
          `;
          
          const textElement = document.createElement('input');
          textElement.value = text;
          textElement.style.cssText = `
            width: 100%;
            padding: 12px;
            margin: 0 0 20px 0;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 14px;
            background: #f8f9fa;
            color: #333;
            box-sizing: border-box;
            font-family: monospace;
          `;
          textElement.setAttribute('readonly', '');
          
          const buttonContainer = document.createElement('div');
          buttonContainer.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: center;
          `;
          
          const copyBtn = document.createElement('button');
          copyBtn.textContent = 'Tentar Copiar';
          copyBtn.style.cssText = `
            background: #007AFF;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
          `;
          
          const closeBtn = document.createElement('button');
          closeBtn.textContent = 'Fechar';
          closeBtn.style.cssText = `
            background: #f1f3f4;
            color: #5f6368;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
          `;
          
          buttonContainer.appendChild(copyBtn);
          buttonContainer.appendChild(closeBtn);
          
          container.appendChild(title);
          container.appendChild(instruction);
          container.appendChild(textElement);
          container.appendChild(buttonContainer);
          
          overlay.appendChild(container);
          document.body.appendChild(overlay);
          
          // Seleciona o texto automaticamente
          setTimeout(() => {
            textElement.focus();
            textElement.select();
          }, 100);
          
          // Função para fechar modal
          const closeModal = () => {
            if (document.body.contains(overlay)) {
              document.body.removeChild(overlay);
            }
          };
          
          // Tentar copiar novamente
          copyBtn.onclick = async () => {
            try {
              if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                toast.success(description ? `${description} copiado!` : 'Link copiado!');
                closeModal();
              } else {
                textElement.select();
                document.execCommand('copy');
                toast.success(description ? `${description} copiado!` : 'Link copiado!');
                closeModal();
              }
            } catch (error) {
              textElement.select();
              toast.info('Selecione o texto e use Ctrl+C (ou Cmd+C no Mac) para copiar');
            }
          };
          
          closeBtn.onclick = closeModal;
          overlay.onclick = (e) => {
            if (e.target === overlay) closeModal();
          };
          
          // Remove automaticamente após 30 segundos
          setTimeout(closeModal, 30000);
          
          return true;
        } else {
          // Para Android, usa prompt
          prompt('Copie o link:', text);
          return true;
        }
      } else {
        // Para desktop, mostra toast discreto
        toast.info('Link: ' + text, {
          duration: 8000,
        });
        return true;
      }
    } catch (error) {
      // Falha silenciosa
      return false;
    }
  };

  const shareViaWhatsApp = (shareUrl: string, deviceInfo?: string) => {
    const message = deviceInfo 
      ? `Olá! Você pode acompanhar o status do reparo do seu ${deviceInfo} através deste link: ${shareUrl}`
      : `Olá! Você pode acompanhar o status do seu reparo através deste link: ${shareUrl}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  return {
    generateShareToken,
    getServiceOrderByToken,
    getCompanyInfoByToken,
    loadShareData,
    copyToClipboard,
    shareViaWhatsApp,
    isGenerating,
    isLoading
  };
}