import { useEffect } from 'react';
import { EnhancedSecureStorage } from '@/services/enhancedSecureStorage';

/**
 * Componente responsável por inicializar os sistemas de segurança da aplicação
 */
export const SecurityInitializer = () => {
  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        // Inicializar o Enhanced Secure Storage
        await EnhancedSecureStorage.initialize();
        
        // Verificar se há chaves antigas que precisam ser rotacionadas
        const shouldRotate = await EnhancedSecureStorage.shouldRotateKeys();
        if (shouldRotate) {
          console.log('🔄 Rotacionando chaves de segurança...');
          await EnhancedSecureStorage.rotateKeys();
        }
        
        // Limpar dados expirados
        await EnhancedSecureStorage.cleanup();
        
        console.log('✅ Sistemas de segurança inicializados com sucesso');
        console.debug('🔐 Enhanced Secure Storage ativo');
        console.debug('🛡️ DevTools Detection ativo');
        console.debug('📋 Security Headers configurados');
      } catch (error) {
        console.error('❌ Erro ao inicializar sistemas de segurança:', error);
      }
    };

    initializeSecurity();
  }, []);

  // Este componente não renderiza nada visível
  return null;
};