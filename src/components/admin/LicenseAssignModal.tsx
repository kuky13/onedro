import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Check, Loader2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

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

interface LicenseAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: License | null;
  onSuccess?: () => void;
}

export const LicenseAssignModal = ({ 
  isOpen, 
  onClose, 
  license, 
  onSuccess 
}: LicenseAssignModalProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  // Fetch available users
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin-users-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_all_users');
      if (error) throw new Error(error.message);
      return (data || []).map((user: { id: string; name: string; email: string; role?: string }) => ({
        id: user.id,
        name: user.name || user.email || 'Usuário sem nome',
        email: user.email || '',
        role: user.role || 'user'
      })) as User[];
    },
    enabled: isOpen
  });

  // Assign license mutation
  const assignLicenseMutation = useMutation({
    mutationFn: async ({ licenseId, userId, notes }: { 
      licenseId: string; 
      userId: string; 
      notes: string; 
    }) => {
      const { data, error } = await supabase.rpc('admin_transfer_license', {
        p_license_id: licenseId,
        p_new_user_id: userId,
        p_notes: notes || 'Atribuição via painel admin'
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess({
        title: 'Licença Atribuída!',
        description: `Licença ${license?.code} foi atribuída com sucesso.`
      });
      queryClient.invalidateQueries({ queryKey: ['admin-licenses'] });
      onSuccess?.();
      handleClose();
    },
    onError: (error: Error) => {
      showError({
        title: 'Erro ao Atribuir Licença',
        description: error.message || 'Ocorreu um erro ao atribuir a licença.'
      });
    }
  });

  const handleAssign = () => {
    if (!license || !selectedUserId) return;
    
    assignLicenseMutation.mutate({
      licenseId: license.id,
      userId: selectedUserId,
      notes
    });
  };

  const handleClose = () => {
    setSelectedUserId('');
    setNotes('');
    onClose();
  };

  const selectedUser = users?.find(user => user.id === selectedUserId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Atribuir Licença a Usuário
          </DialogTitle>
          <DialogDescription>
            Selecione um usuário para atribuir a licença <strong>{license?.code}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* License Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Código da Licença
                </p>
                <p className="text-lg font-mono text-blue-700 dark:text-blue-300">
                  {license?.code}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {license?.expires_at ? 'Com Expiração' : 'Sem Expiração'}
                </p>
                {license?.expires_at && (
                  <p className="text-sm text-blue-500 dark:text-blue-400">
                    {new Date(license.expires_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="user-select">Selecionar Usuário</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um usuário..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingUsers ? (
                  <SelectItem value="loading" disabled>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando usuários...
                    </div>
                  </SelectItem>
                ) : (
                  users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected User Preview */}
          {selectedUser && (
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Usuário Selecionado
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {selectedUser.name} ({selectedUser.email})
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre esta atribuição..."
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
            onClick={handleAssign}
            disabled={!selectedUserId || assignLicenseMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {assignLicenseMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atribuindo...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Atribuir Licença
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};