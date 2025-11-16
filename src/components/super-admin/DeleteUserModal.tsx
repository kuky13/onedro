import { useState } from 'react';
import { useDeleteUser } from '@/hooks/super-admin/useDeleteUser';
import { SuperAdminUser } from '@/hooks/super-admin/useSuperAdminUsers';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Loader2,
  CheckCircle,
  XCircle,
  Database,
  Shield,
  Mail,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface DeleteUserModalProps {
  user: SuperAdminUser;
  open: boolean;
  onClose: () => void;
}

export function DeleteUserModal({ user, open, onClose }: DeleteUserModalProps) {
  const [step, setStep] = useState(1);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [deleteAuthUser, setDeleteAuthUser] = useState(true);
  const [understood, setUnderstood] = useState(false);

  const deleteUserMutation = useDeleteUser();

  const handleClose = () => {
    if (!deleteUserMutation.isPending) {
      setStep(1);
      setConfirmationEmail('');
      setConfirmationCode('');
      setDeleteAuthUser(true);
      setUnderstood(false);
      onClose();
    }
  };

  const handleFirstConfirmation = () => {
    if (understood) {
      setStep(2);
    }
  };

  const handleDeleteUser = async () => {
    if (confirmationEmail !== user.email) {
      toast.error('Email de confirmação não confere');
      return;
    }

    if (confirmationCode !== 'DELETE_USER_PERMANENTLY') {
      toast.error('Código de confirmação inválido. Digite: DELETE_USER_PERMANENTLY');
      return;
    }

    try {
      const result = await deleteUserMutation.mutateAsync({
        userId: user.id,
        confirmationText: 'DELETE_USER_PERMANENTLY',
        deleteAuthUser
      });

      toast.success('Usuário excluído completamente!', {
        description: `${user.name || user.email} foi removido permanentemente. ${result.deleted_data.total_tables_affected} tabelas afetadas.`
      });

      handleClose();
    } catch (error) {
      toast.error('Erro ao excluir usuário', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-sm border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center text-destructive">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center shadow-lg shadow-destructive/25 mr-3">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            Exclusão Completa e Permanente de Usuário
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Esta ação é irreversível e removerá TODOS os dados do usuário de TODAS as tabelas do sistema, 
            liberando completamente o email para novo cadastro.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            {/* Informações do usuário */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-destructive/10 to-destructive/5 backdrop-blur-sm border border-destructive/20 p-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent" />
              <div className="relative">
                <div className="flex items-start space-x-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center shadow-lg shadow-destructive/25">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {user.name || 'Usuário sem nome'}
                    </h3>
                    <p className="text-muted-foreground flex items-center mb-4">
                      <Mail className="h-4 w-4 mr-2" />
                      {user.email}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
                        <div>
                          <span className="font-medium text-foreground">Role:</span>
                          <span className="ml-2 text-muted-foreground">{user.role}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
                        <div>
                          <span className="font-medium text-foreground">Status:</span>
                          <span className="ml-2 text-muted-foreground">
                            {user.license_status || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
                        <div>
                          <span className="font-medium text-foreground">Orçamentos:</span>
                          <span className="ml-2 text-muted-foreground">{user.budgets_count || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
                        <div>
                          <span className="font-medium text-foreground">Criado em:</span>
                          <span className="ml-2 text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Avisos importantes sobre exclusão completa */}
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-sm border border-yellow-200/50 p-6"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent" />
                <div className="relative">
                  <h4 className="font-semibold text-yellow-700 mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center mr-3">
                      <Database className="h-4 w-4 text-white" />
                    </div>
                    ⚠️ Dados que serão PERMANENTEMENTE excluídos:
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-yellow-700">
                    <ul className="space-y-2">
                      <li>• Perfil do usuário e informações pessoais</li>
                      <li>• Todos os orçamentos ({user.budgets_count || 0} orçamentos)</li>
                      <li>• Histórico de transações financeiras</li>
                      <li>• Arquivos e anexos do usuário</li>
                      <li>• Clientes associados ao usuário</li>
                      <li>• Configurações de compartilhamento</li>
                      <li>• Histórico de licenças</li>
                    </ul>
                    <ul className="space-y-2">
                      <li>• Notificações e alertas</li>
                      <li>• Assinaturas push</li>
                      <li>• Preferências de cookies</li>
                      <li>• Dados de analytics do WhatsApp</li>
                      <li>• Números sequenciais</li>
                      <li>• Atualizações do sistema</li>
                      <li>• Dados de autenticação (se selecionado)</li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-destructive/10 to-destructive/5 backdrop-blur-sm border border-destructive/20 p-6"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent" />
                <div className="relative">
                  <h4 className="font-semibold text-destructive mb-4 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center mr-3">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    🚨 ATENÇÃO - Exclusão Completa:
                  </h4>
                  <ul className="text-sm text-destructive space-y-2">
                    <li>• Esta ação é <strong>100% irreversível</strong></li>
                    <li>• O usuário será tratado como se <strong>nunca tivesse existido</strong></li>
                    <li>• O email <strong>{user.email}</strong> será <strong>completamente liberado</strong></li>
                    <li>• Uma nova conta poderá ser criada com o mesmo email</li>
                    <li>• Todos os dados históricos serão perdidos permanentemente</li>
                    <li>• Aproximadamente <strong>15+ tabelas</strong> serão afetadas</li>
                    <li>• A operação é atômica (tudo ou nada)</li>
                  </ul>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm border border-blue-200/50 p-6"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
                <div className="relative">
                  <h4 className="font-semibold text-blue-700 mb-4">ℹ️ Após a exclusão:</h4>
                  <ul className="text-sm text-blue-700 space-y-2">
                    <li>• O email estará disponível para novo cadastro imediatamente</li>
                    <li>• Não haverá conflitos de "email já existe"</li>
                    <li>• O usuário poderá se registrar como uma conta completamente nova</li>
                    <li>• Todos os processos de autenticação funcionarão normalmente</li>
                  </ul>
                </div>
              </motion.div>
            </div>

            {/* Confirmação de entendimento */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50 p-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <div className="relative flex items-start space-x-3">
                <Checkbox
                  id="understood"
                  checked={understood}
                  onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                />
                <Label htmlFor="understood" className="text-sm leading-relaxed text-foreground">
                  Eu entendo que esta ação é <strong>irreversível</strong> e que TODOS os dados do usuário 
                  <strong> {user.name || user.email} </strong> 
                  serão excluídos permanentemente de TODAS as tabelas do sistema, liberando completamente 
                  o email <strong>{user.email}</strong> para novo cadastro.
                </Label>
              </div>
            </motion.div>

            {/* Botões */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="flex justify-end space-x-3"
            >
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleFirstConfirmation}
                disabled={!understood}
                className="bg-gradient-to-r from-destructive to-destructive/90 hover:from-destructive/90 hover:to-destructive shadow-lg shadow-destructive/25"
              >
                Continuar para Confirmação Final
              </Button>
            </motion.div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Confirmação final */}
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirmação Final</h3>
                <p className="text-gray-600">
                  Digite o email exato do usuário para confirmar a exclusão completa
                </p>
              </div>
            </div>

            {/* Campo de confirmação */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="confirmation-email" className="text-base font-medium">
                  Digite o email: <strong className="text-red-600">{user.email}</strong>
                </Label>
                <Input
                  id="confirmation-email"
                  type="email"
                  placeholder="Digite o email exato do usuário"
                  value={confirmationEmail}
                  onChange={(e) => setConfirmationEmail(e.target.value)}
                  className="mt-2"
                  autoComplete="off"
                />
                {confirmationEmail && confirmationEmail !== user.email && (
                  <p className="text-sm text-red-600 mt-1">
                    ❌ Email não confere. Digite exatamente: {user.email}
                  </p>
                )}
                {confirmationEmail === user.email && (
                  <p className="text-sm text-green-600 mt-1">
                    ✅ Email confirmado
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmation-code" className="text-base font-medium">
                  Digite o código de confirmação: <strong className="text-red-600">DELETE_USER_PERMANENTLY</strong>
                </Label>
                <Input
                  id="confirmation-code"
                  type="text"
                  placeholder="Digite: DELETE_USER_PERMANENTLY"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  className="mt-2"
                  autoComplete="off"
                />
                {confirmationCode && confirmationCode !== 'DELETE_USER_PERMANENTLY' && (
                  <p className="text-sm text-red-600 mt-1">
                    ❌ Código não confere. Digite exatamente: DELETE_USER_PERMANENTLY
                  </p>
                )}
                {confirmationCode === 'DELETE_USER_PERMANENTLY' && (
                  <p className="text-sm text-green-600 mt-1">
                    ✅ Código confirmado
                  </p>
                )}
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id="delete-auth"
                  checked={deleteAuthUser}
                  onCheckedChange={(checked) => setDeleteAuthUser(checked as boolean)}
                />
                <Label htmlFor="delete-auth" className="text-sm">
                  <strong>Excluir também os dados de autenticação</strong> (recomendado)
                  <br />
                  <span className="text-gray-600">
                    Isso garante que o email seja completamente liberado para novo cadastro
                  </span>
                </Label>
              </div>
            </div>

            {/* Status da operação */}
            {deleteUserMutation.isPending && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-3" />
                  <div>
                    <span className="text-blue-800 font-medium">Executando exclusão completa...</span>
                    <p className="text-sm text-blue-600">
                      Removendo dados de todas as tabelas relacionadas. Isso pode levar alguns segundos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {deleteUserMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <XCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
                  <div>
                    <span className="text-red-800 font-medium">Erro na exclusão:</span>
                    <p className="text-sm text-red-700 mt-1">
                      {deleteUserMutation.error?.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {deleteUserMutation.isSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <span className="text-green-800 font-medium">Usuário excluído completamente!</span>
                    <p className="text-sm text-green-700 mt-1">
                      Todos os dados foram removidos e o email está liberado para novo cadastro.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                disabled={deleteUserMutation.isPending}
              >
                Voltar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteUser}
                disabled={
                  confirmationEmail !== user.email || 
                  confirmationCode !== 'DELETE_USER_PERMANENTLY' ||
                  deleteUserMutation.isPending
                }
                className="min-w-[200px]"
              >
                {deleteUserMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Excluindo Completamente...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Permanentemente
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}