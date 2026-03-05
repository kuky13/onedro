import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// Cache curto em memória para evitar múltiplas RPCs em navegação rápida.
// (Não persistir em storage por motivos de segurança.)
const ADMIN_CACHE_TTL_MS = 30_000;
let adminCache: { userId: string; isAdmin: boolean; checkedAt: number } | null = null;

interface AdminGuardProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ 
  children, 
  fallbackPath = '/houston' 
}) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        setIsChecking(false);
        return;
      }

      // Cache hit
      if (
        adminCache &&
        adminCache.userId === user.id &&
        Date.now() - adminCache.checkedAt < ADMIN_CACHE_TTL_MS
      ) {
        setIsAdmin(adminCache.isAdmin);
        setIsChecking(false);
        return;
      }

      try {
        setIsChecking(true);

        // RPC única (server-side): evita depender de metadata no JWT.
        const { data, error } = await supabase.rpc('is_current_user_admin');
        
        if (error) {
          console.error('❌ Erro ao verificar status de admin:', error);
          setIsAdmin(false);
          adminCache = { userId: user.id, isAdmin: false, checkedAt: Date.now() };
        } else {
          const ok = !!data;
          setIsAdmin(ok);
          adminCache = { userId: user.id, isAdmin: ok, checkedAt: Date.now() };
        }
      } catch (error) {
        console.error('❌ Erro na verificação de admin:', error);
        setIsAdmin(false);
        adminCache = { userId: user.id, isAdmin: false, checkedAt: Date.now() };
      } finally {
        setIsChecking(false);
      }
    };

    checkAdminStatus();
  }, [user?.id]);

  // Loading state
  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600 text-center">Procurando cookies...</p>
        </div>
      </div>
    );
  }

  // User not authenticated
  if (!user) {
    return (
      <Navigate 
        to="/auth" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // User is not admin
  if (isAdmin === false) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ 
          from: location.pathname,
          message: 'Acesso restrito a administradores' 
        }} 
        replace 
      />
    );
  }

  // User is admin - render protected content
  return <>{children}</>;
};

export default AdminGuard;