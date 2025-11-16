import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLicenseVerification } from '@/hooks/useLicenseVerification';

/**
 * Hook que implementa redirecionamento automático para /verify-licenca
 * apenas quando a página for recarregada E a licença for inválida
 * DESABILITADO temporariamente para evitar loops infinitos
 */
export const useAutoRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Evitar qualquer consulta de licença na rota de verificação para não sobrecarregar
  const isVerifyLicensePage = location.pathname === '/verify-licenca';
  const userIdForHook = isVerifyLicensePage ? null : (user?.id || null);
  
  const { data: licenseData, isLoading } = useLicenseVerification(userIdForHook, {
    cacheTTL: 2 * 60 * 1000, // 2 minutos de cache para redirecionamento
    enableWebSocket: false, // Desabilitar WebSocket para evitar overhead
    enablePolling: false // Desabilitar polling para evitar overhead
  });

  useEffect(() => {
    // TEMPORARIAMENTE DESABILITADO para evitar loops infinitos
    // Retornar early para não executar o redirecionamento automático
    return;
    
    // Verificar se é um reload da página
    const isPageReload = performance.navigation?.type === 1 || 
                        performance.getEntriesByType('navigation')[0]?.type === 'reload';
    
    // Verificar se não estamos já na página de verificação de licença
    const isNotVerifyLicensePage = location.pathname !== '/verify-licenca';
    
    // Debug logs
    console.log('🔍 [useAutoRedirect] Debug info:', {
      isPageReload,
      isNotVerifyLicensePage,
      currentPath: location.pathname,
      hasUser: !!user,
      userId: user?.id,
      isLoadingLicense: isLoading,
      licenseData: licenseData ? {
        has_license: licenseData.has_license,
        is_valid: licenseData.is_valid,
        requires_activation: licenseData.requires_activation,
        requires_renewal: licenseData.requires_renewal
      } : null
    });
    
    // Só processar se for um reload e não estivermos na página de verificação
    if (!isPageReload || !isNotVerifyLicensePage) {
      console.log('🔍 [useAutoRedirect] Não é reload ou já está na página de verificação');
      return;
    }
    
    // Se não há usuário logado, não fazer nada (deixar outros guards tratarem)
    if (!user?.id) {
      console.log('🔍 [useAutoRedirect] Usuário não logado, não redirecionando');
      return;
    }
    
    // Se ainda está carregando a licença, aguardar
    if (isLoading) {
      console.log('🔍 [useAutoRedirect] Ainda carregando dados da licença...');
      return;
    }
    
    // Se não há dados de licença, redirecionar (erro na verificação)
    if (!licenseData) {
      console.log('🔄 [useAutoRedirect] Erro ao verificar licença, redirecionando para /verify-licenca');
      navigate('/verify-licenca', { replace: true });
      return;
    }
    
    // Verificar se a licença é inválida
    const isLicenseInvalid = !licenseData.has_license || 
                           !licenseData.is_valid || 
                           licenseData.requires_activation || 
                           licenseData.requires_renewal;
    
    if (isLicenseInvalid) {
      console.log('🔄 [useAutoRedirect] Licença inválida detectada, redirecionando para /verify-licenca:', {
        has_license: licenseData.has_license,
        is_valid: licenseData.is_valid,
        requires_activation: licenseData.requires_activation,
        requires_renewal: licenseData.requires_renewal
      });
      navigate('/verify-licenca', { replace: true });
    } else {
      console.log('✅ [useAutoRedirect] Licença válida, mantendo usuário na página atual:', location.pathname);
    }
  }, [navigate, location.pathname, user?.id, licenseData, isLoading]);
};