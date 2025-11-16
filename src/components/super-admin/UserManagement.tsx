import { useState } from 'react';
import { useSuperAdminUsers, SuperAdminUser } from '@/hooks/useSuperAdminUsers';
import { DeleteUserModal } from './DeleteUserModal';
import { UserDetailsModal } from './UserDetailsModal';
import { 
  Search, 
  Filter, 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  Trash2, 
  Eye,
  Calendar,
  DollarSign,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Key,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function UserManagement() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<SuperAdminUser | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const limit = 20;
  const offset = (currentPage - 1) * limit;

  const { data: users = [], isLoading, error, refetch } = useSuperAdminUsers({
    search,
    role: roleFilter,
    status: statusFilter,
    limit,
    offset
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: 'bg-gradient-to-r from-red-50 to-red-100/50 text-red-700 border-red-200/50 shadow-sm shadow-red-500/10',
      user: 'bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-700 border-blue-200/50 shadow-sm shadow-blue-500/10',
      premium: 'bg-gradient-to-r from-purple-50 to-purple-100/50 text-purple-700 border-purple-200/50 shadow-sm shadow-purple-500/10'
    };

    return (
      <Badge variant="outline" className={cn("backdrop-blur-sm", variants[role as keyof typeof variants] || variants.user)}>
        {role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (user: SuperAdminUser) => {
    const { license_status, license_code, license_type, days_remaining } = user;
    const isActive = license_status === 'Ativa';
    
    const getVariantClass = () => {
      switch (license_status) {
        case 'Ativa':
          return 'bg-gradient-to-r from-green-50 to-green-100/50 text-green-700 border-green-200/50 shadow-sm shadow-green-500/10';
        case 'Expirada':
          return 'bg-gradient-to-r from-red-50 to-red-100/50 text-red-700 border-red-200/50 shadow-sm shadow-red-500/10';
        case 'Não Ativada':
          return 'bg-gradient-to-r from-orange-50 to-orange-100/50 text-orange-700 border-orange-200/50 shadow-sm shadow-orange-500/10';
        case 'Sem Licença':
          return 'bg-gradient-to-r from-muted/50 to-muted/30 text-muted-foreground border-border/50 shadow-sm';
        default:
          return 'bg-gradient-to-r from-muted/50 to-muted/30 text-muted-foreground border-border/50 shadow-sm';
      }
    };

    const getIcon = () => {
      switch (license_status) {
        case 'Ativa':
          return <UserCheck className="h-3 w-3 mr-1" />;
        case 'Expirada':
        case 'Não Ativada':
        case 'Sem Licença':
        default:
          return <UserX className="h-3 w-3 mr-1" />;
      }
    };

    const getBadgeText = () => {
      if (license_status === 'Ativa' && license_code && days_remaining !== null) {
        return `${license_status} (${days_remaining}d)`;
      }
      return license_status;
    };

    return (
      <Badge 
        variant="outline" 
        className={cn("backdrop-blur-sm", getVariantClass())}
        title={license_code ? `Código: ${license_code} | Tipo: ${license_type || 'Standard'}` : 'Sem licença'}
      >
        {getIcon()}
        {getBadgeText()}
      </Badge>
    );
  };

  const handleDeleteUser = (user: SuperAdminUser) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleViewUser = (user: SuperAdminUser) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleCloseDeleteModal = () => {
    setSelectedUser(null);
    setShowDeleteModal(false);
  };

  const handleCloseDetailsModal = () => {
    setSelectedUser(null);
    setShowDetailsModal(false);
  };

  const UserCard = ({ user }: { user: SuperAdminUser }) => (
    <motion.div
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50 p-6 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative space-y-4">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
            <span className="text-sm font-semibold text-white">
              {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{user.name || 'Sem nome'}</h3>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
        </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Criado em</p>
              <p className="font-medium text-foreground">{formatDate(user.created_at)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Orçamentos</p>
              <p className="font-medium text-foreground">{user.budgets_count}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Último login</p>
              <p className="font-medium text-foreground">
                {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Nunca'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Seção de informações detalhadas da licença */}
        {user.license_code && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center space-x-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Key className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Código da Licença</p>
                  <p className="font-medium font-mono text-xs text-foreground">{user.license_code}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tipo</p>
                  <p className="font-medium text-foreground">{user.license_type || 'Standard'}</p>
                </div>
              </div>
              
              {user.license_expires_at && (
                <div className="flex items-center space-x-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Expira em</p>
                    <p className="font-medium text-foreground">{formatDate(user.license_expires_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-border/30">
          <Button variant="outline" size="sm" onClick={() => handleViewUser(user)} className="bg-background/60 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/30">
            <Eye className="h-4 w-4 mr-1" />
            Visualizar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleDeleteUser(user)}
            className="bg-background/60 backdrop-blur-sm border-border/50 text-red-600 hover:text-red-700 hover:bg-red-50/50 hover:border-red-200/50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir
          </Button>
        </div>
      </div>
    </motion.div>
  );

  if (error) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-orange-500/5 rounded-3xl blur-3xl" />
          <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Gerenciamento de Usuários
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Visualizar e gerenciar todos os usuários do sistema
            </p>
          </div>
        </motion.div>
        
        <div className="bg-gradient-to-r from-red-50/50 to-red-100/30 backdrop-blur-sm border border-red-200/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-red-700 mb-2">Erro ao carregar usuários</h3>
          <p className="text-red-600">
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-orange-500/5 rounded-3xl blur-3xl" />
        <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Gerenciamento de Usuários
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Visualizar e gerenciar todos os usuários do sistema
          </p>
        </div>
      </motion.div>

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
            <Filter className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Filtros</h3>
            <p className="text-muted-foreground text-sm">Refine sua busca</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background/60 backdrop-blur-sm border-border/50"
            />
          </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="bg-background/60 backdrop-blur-sm border-border/50">
                <SelectValue placeholder="Filtrar por role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os roles</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-background/60 backdrop-blur-sm border-border/50">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setSearch('');
                setRoleFilter('all');
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className="bg-background/60 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/30"
            >
              Limpar filtros
            </Button>
          </div>
        </motion.div>

      {/* Lista de usuários */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-6"
      >
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum usuário encontrado</h3>
            <p className="text-muted-foreground">
              Não há usuários que correspondam aos filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {users.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <UserCard user={user} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Paginação */}
      {!isLoading && users.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-between bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50 rounded-2xl p-4"
        >
          <p className="text-sm text-muted-foreground">
            Mostrando {offset + 1} a {Math.min(offset + limit, offset + users.length)} usuários
          </p>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-background/60 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/30"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            
            <span className="text-sm text-foreground px-3 py-1 bg-background/60 backdrop-blur-sm border border-border/50 rounded-lg">
              Página {currentPage}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={users.length < limit}
              className="bg-background/60 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/30"
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Modal de exclusão */}
      {selectedUser && (
        <DeleteUserModal
          user={selectedUser}
          open={showDeleteModal}
          onClose={handleCloseDeleteModal}
        />
      )}

      {/* Modal de detalhes */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          open={showDetailsModal}
          onClose={handleCloseDetailsModal}
          onUserUpdate={refetch}
        />
      )}
    </div>
  );
}