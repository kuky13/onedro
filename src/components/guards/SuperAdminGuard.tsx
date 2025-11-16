import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        console.log('🔒 SuperAdminGuard: Usuário não autenticado');
        setDebugInfo('Usuário não autenticado');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log('🔍 SuperAdminGuard: Verificando permissões para usuário:', user.id);

      try {
        // Primeiro, verificar se o usuário tem role de admin (sem is_active)
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('❌ SuperAdminGuard: Erro ao verificar perfil do usuário:', error);
          setDebugInfo(`Erro ao verificar perfil: ${error.message}`);
          setIsAdmin(false);
        } else if (!profile) {
          console.log('❌ SuperAdminGuard: Perfil não encontrado para o usuário');
          setDebugInfo('Perfil não encontrado');
          setIsAdmin(false);
        } else {
          console.log('📋 SuperAdminGuard: Perfil encontrado:', profile);
          const hasAdminRole = profile.role === 'admin';
          
          if (hasAdminRole) {
            console.log('✅ SuperAdminGuard: Usuário tem role admin');
            setDebugInfo('Usuário autorizado como admin');
            setIsAdmin(true);
          } else {
            console.log('❌ SuperAdminGuard: Usuário não tem role admin. Role atual:', profile.role);
            setDebugInfo(`Role insuficiente: ${profile.role}`);
            setIsAdmin(false);
          }
        }
      } catch (error) {
        console.error('❌ SuperAdminGuard: Erro inesperado ao verificar status de admin:', error);
        setDebugInfo(`Erro inesperado: ${error}`);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  // Mostrar loading enquanto verifica autenticação e permissões
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Procurando cookies...</p>
          {debugInfo && (
            <p className="text-sm text-gray-500">Debug: {debugInfo}</p>
          )}
        </div>
      </div>
    );
  }

  // Redirecionar se não estiver autenticado
  if (!user) {
    console.log('🔄 SuperAdminGuard: Redirecionando para login - usuário não autenticado');
    return <Navigate to="/sign" replace />;
  }

  // Redirecionar se não for admin
  if (!isAdmin) {
    console.log('🔄 SuperAdminGuard: Redirecionando para unauthorized - acesso negado');
    console.log('🔍 SuperAdminGuard: Debug info:', debugInfo);
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('✅ SuperAdminGuard: Acesso autorizado - renderizando conteúdo protegido');
  // Renderizar conteúdo protegido
  return <>{children}</>;
}