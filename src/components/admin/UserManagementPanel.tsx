// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { 
  Users, 
  Search, 
  Filter, 
  RefreshCw, 
  UserPlus, 
  UserMinus, 
  Calendar,
  Mail,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { UserWithLicense, UserFilters, LicenseStatus } from '@/types/userManagement';

interface UserManagementPanelProps {
  onAssignLicense?: (user: UserWithLicense) => void;
  onRemoveLicense?: (user: UserWithLicense) => void;
}

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({
  onAssignLicense,
  onRemoveLicense
}) => {
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    licenseStatus: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const queryClient = useQueryClient();
  const { showError } = useToast();

  // Buscar usuários com detalhes de licenças
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin-users-detailed', filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_all_users_detailed', {
        p_search: filters.search || null,
        p_role_filter: null,
        p_status_filter: filters.licenseStatus === 'all' ? null : filters.licenseStatus,
        p_limit: 50,
        p_offset: 0
      });
      if (error) throw error;
      return data as UserWithLicense[];
    },
    staleTime: 30000, // 30 segundos
  });

  // Função para determinar o status da licença
  const getLicenseStatus = (user: UserWithLicense): LicenseStatus => {
    if (!user.license_id) return 'none';
    if (!user.license_is_active) return 'expired';
    if (user.license_expires_at && new Date(user.license_expires_at) < new Date()) return 'expired';
    return 'active';
  };

  // Função para obter o badge de status
  const getStatusBadge = (user: UserWithLicense) => {
    const status = getLicenseStatus(user);
    
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Ativa
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Expirada
          </Badge>
        );
      case 'none':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            <Clock className="w-3 h-3 mr-1" />
            Sem Licença
          </Badge>
        );
      default:
        return null;
    }
  };

  // Filtrar e ordenar usuários
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    const filtered = users.filter(user => {
      // Filtro de busca
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = !filters.search || 
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower);

      // Filtro de status de licença
      const status = getLicenseStatus(user);
      const matchesStatus = filters.licenseStatus === 'all' ||
        (filters.licenseStatus === 'with_license' && status === 'active') ||
        (filters.licenseStatus === 'without_license' && status === 'none') ||
        (filters.licenseStatus === 'expired' && status === 'expired');

      return matchesSearch && matchesStatus;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'license_expires_at':
          aValue = a.license_expires_at ? new Date(a.license_expires_at) : new Date(0);
          bValue = b.license_expires_at ? new Date(b.license_expires_at) : new Date(0);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, filters]);

  // Estatísticas dos usuários
  const stats = useMemo(() => {
    if (!users) return { total: 0, withLicense: 0, withoutLicense: 0, expired: 0 };

    const total = users.length;
    const withLicense = users.filter(user => getLicenseStatus(user) === 'active').length;
    const withoutLicense = users.filter(user => getLicenseStatus(user) === 'none').length;
    const expired = users.filter(user => getLicenseStatus(user) === 'expired').length;

    return { total, withLicense, withoutLicense, expired };
  }, [users]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users-detailed'] });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-medium">Erro ao carregar usuários</p>
          <p className="text-sm text-muted-foreground mt-1">
            {typeof error === 'string' ? error : error?.message || 'Erro desconhecido'}
          </p>
          <Button variant="outline" onClick={handleRefresh} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Com Licença Ativa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.withLicense}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sem Licença</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.withoutLicense}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Licenças Expiradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros e Busca</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome ou email..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status da Licença</label>
              <Select 
                value={filters.licenseStatus} 
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, licenseStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="with_license">Com Licença Ativa</SelectItem>
                  <SelectItem value="without_license">Sem Licença</SelectItem>
                  <SelectItem value="expired">Licença Expirada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ordenar por</label>
              <Select 
                value={filters.sortBy} 
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, sortBy: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="created_at">Data de Cadastro</SelectItem>
                  <SelectItem value="license_expires_at">Expiração da Licença</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ordem</label>
              <Select 
                value={filters.sortOrder} 
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, sortOrder: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Crescente</SelectItem>
                  <SelectItem value="desc">Decrescente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Usuários ({filteredUsers?.length || 0})</span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Atualizar</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando usuários...</p>
            </div>
          ) : !filteredUsers?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado com os filtros aplicados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map(user => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-sm truncate">{user.name || 'Nome não informado'}</h3>
                          {getStatusBadge(user)}
                        </div>
                        
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Cadastro: {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                          </div>
                          
                          {user.license_expires_at && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Expira: {format(new Date(user.license_expires_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2 mt-3">
                          {getLicenseStatus(user) === 'none' ? (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => onAssignLicense?.(user)}
                              className="flex-1"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Atribuir
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onRemoveLicense?.(user)}
                              className="flex-1"
                            >
                              <UserMinus className="h-3 w-3 mr-1" />
                              Remover
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementPanel;