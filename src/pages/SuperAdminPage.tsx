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
import { AbacateSalesManagement } from '@/components/super-admin/AbacateSalesManagement';

import { lazyWithRetry } from '@/utils/lazyWithRetry';
import { Suspense } from 'react';

const ProblemPage = lazyWithRetry(() => import("./ProblemPage").then(m => ({ default: m.ProblemPage })));
const UpdateManagementPage = lazyWithRetry(() => import("./UpdateManagementPage"));
const VpsMonitorPage = lazyWithRetry(() => import("@/components/super-admin/VpsMonitorPage").then(m => ({ default: m.VpsMonitorPage })));

export function SuperAdminPage() {
  return (
    <SuperAdminLayout>
      <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
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

          {/* Relatórios de Vendas Abacate Pay */}
          <Route path="abacate" element={<AbacateSalesManagement />} />

          {/* Monitoramento da VPS/API externa */}
          <Route path="vps" element={<VpsMonitorPage />} />

          {/* Diagnóstico de problemas */}
          <Route path="problem" element={<ProblemPage />} />

          {/* Gerenciamento de atualizações */}
          <Route path="update" element={<UpdateManagementPage />} />

          {/* Redirecionar rotas não encontradas para o dashboard */}
          <Route path="*" element={<Navigate to="/supadmin" replace />} />
        </Routes>
      </Suspense>
    </SuperAdminLayout>
  );
}
