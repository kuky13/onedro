import React from 'react';
import { Navigate } from 'react-router-dom';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { useAuth } from '@/hooks/useAuth';

interface MaintenanceGuardProps {
  children: React.ReactNode;
}

export const MaintenanceGuard: React.FC<MaintenanceGuardProps> = ({ 
  children
}) => {
  const { isMaintenanceMode, loading } = useMaintenanceMode();
  const { profile } = useAuth();

  // Mostrar loading enquanto verifica o status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando status do sistema...</p>
        </div>
      </div>
    );
  }

  // ADMINISTRADORES SEMPRE TÊM ACESSO TOTAL
  if (profile?.role === 'admin') {
    return <>{children}</>;
  }

  // Se não está em modo de manutenção, renderizar normalmente
  if (!isMaintenanceMode) {
    return <>{children}</>;
  }

  // Redirecionar usuários comuns para página de manutenção
  return <Navigate to="/houston" replace />;
};

export default MaintenanceGuard;