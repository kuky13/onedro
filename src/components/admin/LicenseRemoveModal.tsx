import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
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
import { UserMinus, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface License {
  id: string;
  code: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface LicenseRemoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: License | null;
  onSuccess?: () => void;
}

export const LicenseRemoveModal = ({ 
  isOpen, 
  onClose, 
  license, 
  onSuccess 
}: LicenseRemoveModalProps) => {
  const [notes, setNotes] = useState('');
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  // Remove license mutation (transfer to null user)
  const removeLicenseMutation = useMutation({
    mutationFn: async ({ licenseId, notes }: { 
      licenseId: string; 
      notes: string; 
    }) => {
      const { data, error } = await supabase.rpc('admin_transfer_license', {
        p_license_id: licenseId,
        p_new_user_id: null,
        p_notes: notes || 'Remoção via painel admin'
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess({
        title: 'Licença Removida!',
        description: `Licença ${license?.code} foi removida do usuário com sucesso.`
      });
      queryClient.invalidateQueries({ queryKey: ['admin-licenses'] });
      onSuccess?.();
      handleClose();
    },
    onError: (error: Error) => {
      showError({
        title: 'Erro ao Remover Licença',
        description: error.message || 'Ocorreu um erro ao remover a licença.'
      });
    }
  });

  const handleRemove = () => {
    if (!license) return;
    
    removeLicenseMutation.mutate({
      licenseId: license.id,
      notes
    });
  };

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  const isAssigned = license?.user_id && license?.user_email;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-red-600" />
            Remover Licença do Usuário
          </DialogTitle>
          <DialogDescription>
            Confirme a remoção da licença <strong>{license?.code}</strong> do usuário atual
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* License Info */}
          <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  Código da Licença
                </p>
                <p className="text-lg font-mono text-red-700 dark:text-red-300">
                  {license?.code}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {license?.expires_at ? 'Com Expiração' : 'Sem Expiração'}
                </p>
                {license?.expires_at && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {new Date(license.expires_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Current User Info */}
          {isAssigned ? (
            <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Usuário Atual
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    {license.user_name || 'Nome não disponível'} ({license.user_email})
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta licença não está atribuída a nenhum usuário.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning */}
          {isAssigned && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                <strong>Atenção:</strong> Ao remover esta licença, o usuário perderá o acesso 
                imediatamente. Esta ação pode ser revertida atribuindo a licença novamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Motivo da Remoção (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Descreva o motivo da remoção da licença..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleRemove}
            disabled={!isAssigned || removeLicenseMutation.isPending}
            variant="destructive"
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