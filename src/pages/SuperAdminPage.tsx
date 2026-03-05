import { Routes, Route, Navigate } from 'react-router-dom';
import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { Dashboard } from '@/components/super-admin/Dashboard';
import { UserManagement } from '@/components/UserManagement';
import { PeliculasManagement } from '@/components/super-admin/PeliculasManagement';
import { DrippyManagement } from '@/components/super-admin/DrippyManagement';
import { AppsHub } from '@/components/super-admin/AppsHub';
import { PlansManagement } from '@/components/super-admin/PlansManagement';
import { CouponsManagement } from '@/components/super-admin/CouponsManagement';
import { SmsManagement } from '@/components/super-admin/SmsManagement';
import { LicenseManagement } from '@/components/super-admin/LicenseManagement';
import { WhatsAppManagement } from '@/components/super-admin/WhatsAppManagement';
import { VpsMonitorPage } from '@/components/super-admin/VpsMonitorPage';
import { DownloadVideoPage } from '@/components/super-admin/DownloadVideoPage';

export function SuperAdminPage() {
  return (
    <SuperAdminLayout>
      <Routes>
        {/* Dashboard principal */}
        <Route index element={<Dashboard />} />

        {/* Gerenciamento de usuários */}
        <Route path="users" element={<UserManagement />} />

        {/* Gerenciamento da Drippy IA */}
        <Route path="drippy" element={<DrippyManagement />} />

        {/* Gerenciamento de películas compatíveis */}
        <Route path="p" element={<PeliculasManagement />} />

        {/* Hub de Aplicativos */}
        <Route path="apps" element={<AppsHub />} />

        {/* Gerenciamento de Planos */}
        <Route path="plans" element={<PlansManagement />} />

        {/* Gerenciamento de Licenças */}
        <Route path="licenca" element={<LicenseManagement />} />

        {/* Gerenciamento de Cupons */}
        <Route path="coupons" element={<CouponsManagement />} />

        {/* Gestão de SMS & Mensagens */}
        <Route path="sms" element={<SmsManagement />} />

        {/* Configuração de orçamentos via WhatsApp (Evolution) */}
        <Route path="whatsapp" element={<WhatsAppManagement />} />

        {/* Monitoramento da VPS/API externa */}
        <Route path="vps" element={<VpsMonitorPage />} />

        {/* Download de Vídeos */}
        <Route path="dw" element={<DownloadVideoPage />} />

        {/* Redirecionar rotas não encontradas para o dashboard */}
        <Route path="*" element={<Navigate to="/supadmin" replace />} />
      </Routes>
    </SuperAdminLayout>
  );
}