# Guia de Implementação - Painel de Super Administrador

## 1. Estrutura de Arquivos

```
src/
├── pages/
│   └── SuperAdminPage.tsx                 # Página principal do super admin
├── components/
│   ├── super-admin/
│   │   ├── SuperAdminDashboard.tsx        # Dashboard principal
│   │   ├── UserManagement/
│   │   │   ├── UserList.tsx               # Lista de usuários
│   │   │   ├── UserProfile.tsx            # Perfil detalhado
│   │   │   ├── UserActions.tsx            # Ações administrativas
│   │   │   └── DeleteUserModal.tsx        # Modal de exclusão
│   │   ├── ServiceOrderManagement/
│   │   │   ├── UserServiceOrders.tsx      # OS por usuário
│   │   │   └── ServiceOrderActions.tsx    # Ações em OS
│   │   ├── DataManagement/
│   │   │   ├── DataCleanup.tsx            # Limpeza de dados
│   │   │   └── BulkOperations.tsx         # Operações em lote
│   │   ├── AuditLogs/
│   │   │   ├── LogsViewer.tsx             # Visualizador de logs
│   │   │   └── LogsFilters.tsx            # Filtros de logs
│   │   └── Navigation/
│   │       ├── SuperAdminSidebar.tsx      # Navegação lateral
│   │       └── SuperAdminHeader.tsx       # Cabeçalho
│   └── guards/
│       └── SuperAdminGuard.tsx            # Proteção de rota
├── hooks/
│   ├── useSuperAdminUsers.ts              # Hook para usuários
│   ├── useSuperAdminActions.ts            # Hook para ações admin
│   └── useAuditLogs.ts                    # Hook para logs
└── types/
    └── super-admin.ts                     # Tipos TypeScript
```

## 2. Componentes Principais

### 2.1 SuperAdminGuard.tsx

```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export const SuperAdminGuard: React.FC<SuperAdminGuardProps> = ({ children }) => {
  const { user, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !profile || profile.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

### 2.2 SuperAdminPage.tsx

```typescript
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SuperAdminGuard } from '@/components/guards/SuperAdminGuard';
import { SuperAdminDashboard } from '@/components/super-admin/SuperAdminDashboard';
import { UserManagement } from '@/components/super-admin/UserManagement';
import { ServiceOrderManagement } from '@/components/super-admin/ServiceOrderManagement';
import { DataManagement } from '@/components/super-admin/DataManagement';
import { AuditLogs } from '@/components/super-admin/AuditLogs';
import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';

export const SuperAdminPage: React.FC = () => {
  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <Routes>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="users/*" element={<UserManagement />} />
          <Route path="service-orders" element={<ServiceOrderManagement />} />
          <Route path="data-management" element={<DataManagement />} />
          <Route path="audit-logs" element={<AuditLogs />} />
        </Routes>
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
};
```

### 2.3 UserManagement/UserList.tsx

```typescript
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search, 
  UserX, 
  Edit, 
  Eye, 
  MoreHorizontal 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  service_orders_count: number;
  total_revenue: number;
}

export const UserList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['super-admin-users', search, roleFilter, statusFilter],
    queryFn: async (): Promise<User[]> => {
      const { data, error } = await supabase.rpc('admin_get_all_users_detailed', {
        p_search: search || null,
        p_role_filter: roleFilter || null,
        p_status_filter: statusFilter || null,
        p_limit: 100,
        p_offset: 0
      });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const handleDeleteUser = async (userId: string) => {
    // Implementar modal de confirmação e exclusão
    console.log('Delete user:', userId);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Carregando usuários...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Erro ao carregar usuários</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">Todos os papéis</option>
          <option value="admin">Admin</option>
          <option value="user">Usuário</option>
        </select>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>OS</TableHead>
              <TableHead>Receita</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[50px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? 'default' : 'secondary'}>
                    {user.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>{user.service_orders_count}</TableCell>
                <TableCell>R$ {user.total_revenue?.toFixed(2) || '0.00'}</TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
```

### 2.4 UserManagement/DeleteUserModal.tsx

```typescript
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    email: string;
    service_orders_count: number;
  } | null;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  onClose,
  user
}) => {
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [deleteAuthUser, setDeleteAuthUser] = useState(true);
  const [step, setStep] = useState(1);
  
  const queryClient = useQueryClient();

  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não encontrado');
      
      const { data, error } = await supabase.rpc('admin_delete_user_completely', {
        p_user_id: user.id,
        p_confirmation_code: confirmationEmail,
        p_delete_auth_user: deleteAuthUser
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Usuário excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir usuário');
    }
  });

  const resetForm = () => {
    setConfirmationEmail('');
    setDeleteAuthUser(true);
    setStep(1);
  };

  const handleClose = () => {
    if (!deleteUserMutation.isPending) {
      onClose();
      resetForm();
    }
  };

  const canProceed = confirmationEmail === user?.email;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Excluir Usuário Permanentemente
          </DialogTitle>
          <DialogDescription>
            Esta ação é irreversível e excluirá todos os dados do usuário.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">
                Dados que serão excluídos:
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Perfil do usuário: {user?.name}</li>
                <li>• {user?.service_orders_count} ordens de serviço</li>
                <li>• Todos os orçamentos associados</li>
                <li>• Histórico de atividades</li>
                <li>• Arquivos e documentos</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Digite o email do usuário para confirmar: <strong>{user?.email}</strong>
              </Label>
              <Input
                id="confirmation"
                value={confirmationEmail}
                onChange={(e) => setConfirmationEmail(e.target.value)}
                placeholder="Digite o email exato..."
                className={confirmationEmail && !canProceed ? 'border-red-500' : ''}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="delete-auth"
                checked={deleteAuthUser}
                onCheckedChange={setDeleteAuthUser}
              />
              <Label htmlFor="delete-auth" className="text-sm">
                Excluir também do sistema de autenticação (recomendado)
              </Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={deleteUserMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteUserMutation.mutate()}
            disabled={!canProceed || deleteUserMutation.isPending}
          >
            {deleteUserMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir Permanentemente'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

## 3. Hooks Personalizados

### 3.1 useSuperAdminUsers.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  service_orders_count: number;
  total_revenue: number;
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const useSuperAdminUsers = (filters: UserFilters = {}) => {
  return useQuery({
    queryKey: ['super-admin-users', filters],
    queryFn: async (): Promise<SuperAdminUser[]> => {
      const { data, error } = await supabase.rpc('admin_get_all_users_detailed', {
        p_search: filters.search || null,
        p_role_filter: filters.role || null,
        p_status_filter: filters.status || null,
        p_limit: filters.limit || 50,
        p_offset: filters.offset || 0
      });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      confirmationCode,
      deleteAuthUser = true
    }: {
      userId: string;
      confirmationCode: string;
      deleteAuthUser?: boolean;
    }) => {
      const { data, error } = await supabase.rpc('admin_delete_user_completely', {
        p_user_id: userId,
        p_confirmation_code: confirmationCode,
        p_delete_auth_user: deleteAuthUser
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
    }
  });
};
```

## 4. Integração com App.tsx

Para integrar o painel no App.tsx existente, adicione a rota:

```typescript
// Adicionar import
import { SuperAdminPage } from "./pages/SuperAdminPage";

// Adicionar dentro das Routes
<Route 
  path="/supadmin/*" 
  element={
    <MaintenanceGuard>
      <SuperAdminPage />
    </MaintenanceGuard>
  } 
/>
```

## 5. Configuração de Segurança

### 5.1 Atualizar routeConfig.ts

```typescript
// Adicionar às rotas que requerem admin
adminRequiredRoutes: [
  '/supadmin',
  '/supadmin/*'
],

// Função para verificar se rota requer admin
export const requiresAdmin = (path: string): boolean => {
  return ROUTE_CONFIG.adminRequiredRoutes.some(route => {
    if (route.endsWith('/*')) {
      const basePath = route.slice(0, -2);
      return path.startsWith(basePath);
    }
    return path === route;
  });
};
```

## 6. Testes e Validação

### 6.1 Checklist de Implementação

- [ ] Criar estrutura de arquivos
- [ ] Implementar SuperAdminGuard
- [ ] Criar página principal SuperAdminPage
- [ ] Implementar UserList com filtros
- [ ] Criar modal de exclusão de usuário
- [ ] Implementar hooks personalizados
- [ ] Adicionar rota no App.tsx
- [ ] Configurar segurança no routeConfig
- [ ] Criar funções RPC no Supabase
- [ ] Testar exclusão de usuários
- [ ] Validar logs de auditoria
- [ ] Testar responsividade
- [ ] Validar permissões de acesso

### 6.2 Comandos de Teste

```bash
# Testar build
npm run build

# Testar tipos TypeScript
npm run type-check

# Executar testes
npm run test
```

Este guia fornece uma base sólida para implementar o painel de super administrador, aproveitando a estrutura existente do projeto One-Drip e seguindo as melhores práticas de segurança e usabilidade.