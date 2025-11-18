import { Routes, Route, Navigate } from 'react-router-dom';
import { SuperAdminGuard } from '@/components/guards/SuperAdminGuard';
import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { Dashboard } from '@/components/super-admin/Dashboard';
import { UserManagement } from '@/components/UserManagement';
import { DataManagement } from '@/components/super-admin/DataManagement';
import { PushNotificationPanel } from '@/components/super-admin/PushNotificationPanel';
import { PeliculasManagement } from '@/components/super-admin/PeliculasManagement';

export function SuperAdminPage() {
  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <Routes>
          {/* Dashboard principal */}
          <Route index element={<Dashboard />} />
          
          {/* Gerenciamento de usuários */}
          <Route path="users" element={<UserManagement />} />
          
          {/* Gerenciamento de dados */}
          <Route path="data" element={<DataManagement />} />
          
          {/* Gerenciamento de notificações push */}
          <Route path="notifications" element={<PushNotificationPanel />} />
          
          {/* Gerenciamento de películas compatíveis */}
          <Route path="p" element={<PeliculasManagement />} />
          
          {/* Redirecionar rotas não encontradas para o dashboard */}
          <Route path="*" element={<Navigate to="/supadmin" replace />} />
        </Routes>
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}