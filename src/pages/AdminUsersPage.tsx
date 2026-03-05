import { SuperAdminGuard } from '@/components/guards/SuperAdminGuard';
import { UserManagement } from '@/components/UserManagement';

export function AdminUsersPage() {
  return (
    <SuperAdminGuard>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto py-8 px-4">
          <UserManagement />
        </div>
      </div>
    </SuperAdminGuard>
  );
}

export default AdminUsersPage;
