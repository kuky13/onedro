import { getCachedCompanyData, CompanyDataForPDF } from '@/hooks/useCompanyDataLoader';
import { CompanyData } from './types';

let localCompanyCache: { data: CompanyDataForPDF; hasData: boolean; timestamp: number } | null = null;

export const getLocalCompanyCache = () => localCompanyCache;

export const updateCompanyDataCache = (data: CompanyDataForPDF, hasData: boolean) => {
  localCompanyCache = { data, hasData, timestamp: Date.now() };
};

export const validateCompanyData = (companyData?: CompanyData): CompanyDataForPDF => {
  const localCache = getLocalCompanyCache();
  let fallbackData: CompanyDataForPDF | null = null;

  if (localCache?.hasData) {
    fallbackData = localCache.data;
  } else {
    const cachedData = getCachedCompanyData();
    if (cachedData?.hasData) {
      try {
        const shopData = cachedData.shopProfile;
        const companyInfo = cachedData.companyInfo;
        fallbackData = {
          shop_name: shopData?.shop_name || companyInfo?.name || 'Minha Empresa',
          address: shopData?.address || companyInfo?.address || '',
          contact_phone: shopData?.contact_phone || companyInfo?.whatsapp_phone || '',
          logo_url: shopData?.logo_url || companyInfo?.logo_url || '',
          email: companyInfo?.email || '',
          cnpj: shopData?.cnpj || '',
        };
      } catch {
        // ignore
      }
    }
  }

  return {
    shop_name: companyData?.shop_name || fallbackData?.shop_name || 'Minha Loja',
    address: companyData?.address || fallbackData?.address || '',
    contact_phone: companyData?.contact_phone || fallbackData?.contact_phone || '',
    logo_url: companyData?.logo_url || fallbackData?.logo_url || '',
    email: companyData?.email || fallbackData?.email || '',
    cnpj: companyData?.cnpj || fallbackData?.cnpj || '',
  };
};

export const hasValidCompanyDataForPDF = (): boolean => {
  const cachedData = getCachedCompanyData();
  if (cachedData?.hasData) {
    const shopData = cachedData.shopProfile;
    const companyInfo = cachedData.companyInfo;
    const shopName = shopData?.shop_name || companyInfo?.name;
    return !!(shopName && shopName !== 'Minha Empresa' && shopName !== 'Minha Loja');
  }
  return false;
};
