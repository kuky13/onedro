import { SuperAdminUser } from '@/hooks/super-admin/useSuperAdminUsers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';

import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  ClipboardList,
  Clock,
  Key,
  Wrench
} from 'lucide-react';

interface UserDetailsModalProps {
  user: SuperAdminUser | null;
  open: boolean;
  onClose: () => void;
  onUserUpdate?: () => void;
}

export function UserDetailsModal({ user, open, onClose, onUserUpdate }: UserDetailsModalProps) {

  if (!user) return null;

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
      admin: 'bg-gradient-to-r from-red-500/10 to-red-600/10 text-red-700 border-red-200/50 shadow-sm backdrop-blur-sm',
      user: 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 border-blue-200/50 shadow-sm backdrop-blur-sm',
      premium: 'bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-700 border-purple-200/50 shadow-sm backdrop-blur-sm'
    };

    return (
      <Badge variant="outline" className={variants[role as keyof typeof variants] || variants.user}>
        {role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };



  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-sm border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-foreground">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
              <User className="h-4 w-4 text-white" />
            </div>
            <span>Detalhes do Usuário</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações básicas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <div className="relative">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                  <span className="text-lg font-semibold text-white">
                    {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-xl font-semibold text-foreground">{user.name || 'Sem nome'}</div>
                  <div className="text-muted-foreground">{user.email}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Função</p>
                  {getRoleBadge(user.role)}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Informações de conta */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-foreground mb-4">Informações da Conta</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Último login</p>
                    <p className="font-medium text-foreground">
                      {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Nunca'}
                    </p>
                  </div>
                </div>

                {user.license_expires_at && (
                  <div className="flex items-center space-x-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                      <Key className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Licença expira em</p>
                      <p className="font-medium text-foreground">{formatDate(user.license_expires_at)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">ID do usuário</p>
                    <p className="font-medium text-xs font-mono text-foreground">{user.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>



          {/* Estatísticas de uso */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-foreground mb-2">Estatísticas de Uso</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Resumo das atividades do usuário no sistema
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-sm rounded-2xl border border-green-200/30 shadow-lg shadow-green-500/10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/25">
                    <ClipboardList className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-green-700 mb-1">{user.budgets_count}</div>
                  <div className="text-sm text-green-600 font-medium">Orçamentos</div>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-sm rounded-2xl border border-blue-200/30 shadow-lg shadow-blue-500/10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
                    <Wrench className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-blue-700 mb-1">{user.service_orders_count}</div>
                  <div className="text-sm text-blue-600 font-medium">Ordens de Serviço</div>
                </div>
              </div>
            </div>
          </motion.div>


        </div>
      </DialogContent>


    </Dialog>
  );
}