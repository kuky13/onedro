import { useState, useEffect, useCallback, useMemo } from 'react';
import { useShopProfile, ShopProfile } from './useShopProfile';
import { useCompanyBranding, CompanyInfo, CompanyShareSettings } from './useCompanyBranding';
import { useAuth } from './useAuth';

export interface CombinedCompanyData {
  shopProfile: ShopProfile | null;
  companyInfo: CompanyInfo | null;
  shareSettings: CompanyShareSettings | null;
  isLoading: boolean;
  hasData: boolean;
  error: string | null;
}

export interface CompanyDataForPDF {
  shop_name: string;
  address: string;
  contact_phone: string;
  logo_url: string;
  email: string;
  cnpj: string;
}

// Cache global para dados da empresa
let companyDataCache: CombinedCompanyData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Função para sincronizar com o cache do pdfUtils
const syncWithPdfUtilsCache = (data: CombinedCompanyData) => {
  // Importar dinamicamente para evitar dependência circular
  import('../utils/pdfUtils').then(({ updateCompanyDataCache }) => {
    // Priorizar companyInfo em vez de shopProfile
    const pdfData = {
      shop_name: data.companyInfo?.name || data.shopProfile?.shop_name || 'Minha Empresa',
      address: data.companyInfo?.address || data.shopProfile?.address || '',
      contact_phone: data.companyInfo?.whatsapp_phone || data.shopProfile?.contact_phone || '',
      logo_url: data.companyInfo?.logo_url || data.shopProfile?.logo_url || '',
      email: data.companyInfo?.email || '',
      cnpj: data.companyInfo?.cnpj || data.shopProfile?.cnpj || ''
    };
    
    updateCompanyDataCache(pdfData, data.hasData);
  }).catch(console.error);
};

export const useCompanyDataLoader = () => {
  const { user } = useAuth();
  const { shopProfile, isLoading: shopLoading } = useShopProfile();
  const { companyInfo, shareSettings, loading: brandingLoading, fetchCompanyBranding } = useCompanyBranding();
  
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Verificar se o cache ainda é válido
  const isCacheValid = useMemo(() => {
    return companyDataCache && (Date.now() - cacheTimestamp) < CACHE_DURATION;
  }, []);

  // Combinar dados de ambos os hooks
  const combinedData = useMemo((): CombinedCompanyData => {
    const isLoading = shopLoading || brandingLoading;
    const hasData = !!(shopProfile || companyInfo);
    
    return {
      shopProfile,
      companyInfo,
      shareSettings,
      isLoading,
      hasData,
      error
    };
  }, [shopProfile, companyInfo, shareSettings, shopLoading, brandingLoading, error]);

  // Atualizar cache quando os dados mudarem
  useEffect(() => {
    if (!combinedData.isLoading && combinedData.hasData) {
      companyDataCache = combinedData;
      cacheTimestamp = Date.now();
      setError(null);
      
      // Sincronizar com o cache do pdfUtils
      syncWithPdfUtilsCache(combinedData);
    }
  }, [combinedData]);

  // Carregar dados automaticamente quando o usuário estiver disponível
  useEffect(() => {
    if (user?.id && !isInitialized) {
      setIsInitialized(true);
      
      // Se não temos cache válido, forçar carregamento
      if (!isCacheValid) {
        fetchCompanyBranding().catch((err) => {
          console.error('Erro ao carregar dados da empresa:', err);
          setError('Erro ao carregar dados da empresa');
        });
      }
    }
  }, [user?.id, isInitialized, isCacheValid, fetchCompanyBranding]);

  // Função para recarregar dados
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      await fetchCompanyBranding();
      
      // Forçar atualização do cache após recarregar
      setTimeout(() => {
        if (companyDataCache) {
          syncWithPdfUtilsCache(companyDataCache);
        }
      }, 100);
    } catch (err) {
      console.error('Erro ao recarregar dados da empresa:', err);
      setError('Erro ao recarregar dados da empresa');
    }
  }, [fetchCompanyBranding]);

  // Função para obter dados formatados para PDF com fallbacks robustos
  const getCompanyDataForPDF = useCallback((): CompanyDataForPDF => {
    // Usar cache se disponível e válido
    const dataSource = isCacheValid ? companyDataCache : combinedData;
    
    const shopData = dataSource?.shopProfile;
    const companyData = dataSource?.companyInfo;
    
    // Priorizar companyInfo em vez de shopProfile
    const result = {
      shop_name: companyData?.name || shopData?.shop_name || 'Minha Empresa',
      address: companyData?.address || shopData?.address || '',
      contact_phone: companyData?.whatsapp_phone || shopData?.contact_phone || '',
      logo_url: companyData?.logo_url || shopData?.logo_url || '',
      email: companyData?.email || '',
      cnpj: companyData?.cnpj || shopData?.cnpj || ''
    };
    
    return result;
  }, [combinedData, isCacheValid, shopProfile, companyInfo]);

  // Função para verificar se temos dados mínimos necessários
  const hasMinimalData = useCallback((): boolean => {
    // Priorizar companyInfo em vez de shopProfile
    const hasCompanyName = !!(companyInfo?.name && companyInfo.name !== 'Minha Empresa' && companyInfo.name !== 'Minha Loja');
    return hasCompanyName;
  }, [companyInfo?.name]);

  // Retornar dados do cache se disponível e válido
  if (isCacheValid && companyDataCache) {
    return {
      ...companyDataCache,
      refreshData,
      getCompanyDataForPDF,
      hasMinimalData,
      isCacheValid: true
    };
  }

  return {
    ...combinedData,
    refreshData,
    getCompanyDataForPDF,
    hasMinimalData,
    isCacheValid: false
  };
};

// Função utilitária para limpar cache (útil para logout)
export const clearCompanyDataCache = () => {
  companyDataCache = null;
  cacheTimestamp = 0;
};

// Função utilitária para obter dados do cache sem hook
export const getCachedCompanyData = (): CombinedCompanyData | null => {
  const isValid = companyDataCache && (Date.now() - cacheTimestamp) < CACHE_DURATION;
  
  if (isValid) {
    return companyDataCache;
  }
  return null;
};