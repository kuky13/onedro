import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

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

      try {
        setIsChecking(true);
        
        const { data, error } = await supabase.rpc('is_admin', {
          user_id: user.id
        });
        
        if (error) {
          console.error('❌ Erro ao verificar status de admin:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data as boolean);
        }
      } catch (error) {
        console.error('❌ Erro na verificação de admin:', error);
        setIsAdmin(false);
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
          <p className="text-gray-600">Procurando cookies...</p>
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