// @ts-nocheck
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { 
  UserMinus, 
  Key, 
  Calendar, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { UserWithLicense, UserRemoveLicenseModalProps } from '@/types/userManagement';

export const UserRemoveLicenseModal: React.FC<UserRemoveLicenseModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [reason, setReason] = useState<string>('');
  
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  // Mutation para remover licença (transferir para null)
  const removeLicenseMutation = useMutation({
    mutationFn: async ({ licenseId, reason }: { licenseId: string; reason: string }) => {
      // Para remover uma licença, transferimos ela para null (sem usuário)
      const { data, error } = await supabase
        .from('licenses')
        .update({ 
          user_id: null,
          activated_at: null
        })
        .eq('id', licenseId);
      
      if (error) throw error;

      // Registrar o motivo da remoção em logs se necessário
      if (reason) {
        await supabase.from('license_history').insert({
          license_id: licenseId,
          user_id: user.id,
          action: 'removed',
          notes: reason,
          performed_by: (await supabase.auth.getUser()).data.user?.id
        }).catch(console.error); // Não falhar se não conseguir registrar o log
      }
      
      return { success: true };
    },
    onSuccess: () => {
      showSuccess({
        title: 'Licença Removida!',
        description: `Licença removida com sucesso de ${user.name || user.email}.`
      });
      
      // Invalidar queries para atualizar as listas
      queryClient.invalidateQueries({ queryKey: ['admin-users-detailed'] });
      queryClient.invalidateQueries({ queryKey: ['admin-available-licenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-licenses'] });
      
      onSuccess();
      handleClose();
    },
    onError: (error: any) => {
      console.error('Error removing license:', error);
      showError({
        title: 'Erro na Remoção',
        description: error?.message || 'Não foi possível remover a licença.'
      });
    }
  });

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleRemove = () => {
    if (!user.license_id) {
      showError({
        title: 'Erro',
        description: 'Usuário não possui licença para remover.'
      });
      return;
    }

    if (!reason.trim()) {
      showError({
        title: 'Motivo Obrigatório',
        description: 'Por favor, informe o motivo da remoção da licença.'
      });
      return;
    }

    removeLicenseMutation.mutate({
      licenseId: user.license_id,
      reason: reason.trim()
    });
  };

  const isLicenseExpired = user.license_expires_at && new Date(user.license_expires_at) < new Date();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserMinus className="h-5 w-5" />
            <span>Remover Licença</span>
          </DialogTitle>
          <DialogDescription>
            Confirme a remoção da licença do usuário. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Usuário */}
          <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-medium">{user.name || 'Nome não informado'}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Informações da Licença Atual */}
          {user.license_id && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800 dark:text-red-200">Licença a ser Removida</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center space-x-2">
                  <Key className="h-3 w-3 text-red-600" />
                  <span className="font-mono">{user.license_code}</span>
                </div>
                {user.license_expires_at && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-3 w-3 text-red-600" />
                    <span>
                      {isLicenseExpired ? 'Expirou em: ' : 'Expira em: '}
                      {format(new Date(user.license_expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                )}
                <Badge 
                  variant={isLicenseExpired ? "destructive" : "default"}
                  className={isLicenseExpired ? 
                    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : 
                    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  }
                >
                  {isLicenseExpired ? 'Expirada' : 'Ativa'}
                </Badge>
              </div>
            </div>
          )}

          {/* Aviso */}
          <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-1">Atenção:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>A licença será removida do usuário e ficará disponível para reatribuição</li>
                <li>O usuário perderá acesso aos recursos premium imediatamente</li>
                <li>Esta ação será registrada no histórico do sistema</li>
              </ul>
            </div>
          </div>

          {/* Motivo da Remoção */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Remoção *</Label>
            <Textarea
              id="reason"
              placeholder="Informe o motivo da remoção da licença..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">
              Este motivo será registrado no histórico para auditoria.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={removeLicenseMutation.isPending}>
            Cancelar
          </Button>
          <Button 
            variant="destructive"
            onClick={handleRemove} 
            disabled={!reason.trim() || removeLicenseMutation.isPending}
          >
            {removeLicenseMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removendo...
              </>
            ) : (
              <>
                <UserMinus className="mr-2 h-4 w-4" />
                Remover Licença
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserRemoveLicenseModal;