// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { 
  UserPlus, 
  Key, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { UserWithLicense, AvailableLicense, UserAssignLicenseModalProps } from '@/types/userManagement';

export const UserAssignLicenseModal: React.FC<UserAssignLicenseModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [selectedLicenseId, setSelectedLicenseId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  // Buscar licenças disponíveis
  const { data: availableLicenses, isLoading: isLoadingLicenses } = useQuery({
    queryKey: ['admin-available-licenses'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_available_licenses');
      if (error) throw error;
      return data as AvailableLicense[];
    },
    enabled: isOpen,
  });

  // Mutation para transferir licença
  const assignLicenseMutation = useMutation({
    mutationFn: async ({ licenseId, userId, notes }: { licenseId: string; userId: string; notes: string }) => {
      const { data, error } = await supabase.rpc('admin_transfer_license', {
        license_id: licenseId,
        target_user_id: userId,
        notes: notes || null
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        showSuccess({
          title: 'Licença Atribuída!',
          description: `Licença atribuída com sucesso para ${user.name || user.email}.`
        });
        
        // Invalidar queries para atualizar as listas
        queryClient.invalidateQueries({ queryKey: ['admin-users-detailed'] });
        queryClient.invalidateQueries({ queryKey: ['admin-available-licenses'] });
        queryClient.invalidateQueries({ queryKey: ['admin-licenses'] });
        
        onSuccess();
        handleClose();
      } else {
        showError({
          title: 'Erro na Atribuição',
          description: data?.message || 'Não foi possível atribuir a licença.'
        });
      }
    },
    onError: (error: any) => {
      console.error('Error assigning license:', error);
      showError({
        title: 'Erro na Atribuição',
        description: error?.message || 'Não foi possível atribuir a licença.'
      });
    }
  });

  const handleClose = () => {
    setSelectedLicenseId('');
    setNotes('');
    onClose();
  };

  const handleAssign = () => {
    if (!selectedLicenseId) {
      showError({
        title: 'Licença Obrigatória',
        description: 'Por favor, selecione uma licença para atribuir.'
      });
      return;
    }

    assignLicenseMutation.mutate({
      licenseId: selectedLicenseId,
      userId: user.id,
      notes
    });
  };

  const selectedLicense = availableLicenses?.find(license => license.id === selectedLicenseId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Atribuir Licença</span>
          </DialogTitle>
          <DialogDescription>
            Selecione uma licença disponível para atribuir ao usuário.
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

          {/* Seleção de Licença */}
          <div className="space-y-2">
            <Label htmlFor="license-select">Licença Disponível</Label>
            {isLoadingLicenses ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Carregando licenças...</span>
              </div>
            ) : !availableLicenses?.length ? (
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  Nenhuma licença disponível no momento
                </span>
              </div>
            ) : (
              <Select value={selectedLicenseId} onValueChange={setSelectedLicenseId}>
                <SelectTrigger id="license-select">
                  <SelectValue placeholder="Selecione uma licença..." />
                </SelectTrigger>
                <SelectContent>
                  {availableLicenses.map(license => (
                    <SelectItem key={license.id} value={license.id}>
                      <div className="flex items-center space-x-2">
                        <Key className="h-3 w-3" />
                        <span className="font-mono text-xs">{license.code}</span>
                        <span className="text-xs text-muted-foreground">
                          - Expira em {format(new Date(license.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Detalhes da Licença Selecionada */}
          {selectedLicense && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">Licença Selecionada</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center space-x-2">
                  <Key className="h-3 w-3 text-green-600" />
                  <span className="font-mono">{selectedLicense.code}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-3 w-3 text-green-600" />
                  <span>Expira em: {format(new Date(selectedLicense.expires_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Ativa
                </Badge>
              </div>
            </div>
          )}

          {/* Observações */}
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
          <Button variant="outline" onClick={handleClose} disabled={assignLicenseMutation.isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedLicenseId || assignLicenseMutation.isPending || !availableLicenses?.length}
          >
            {assignLicenseMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atribuindo...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Atribuir Licença
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserAssignLicenseModal;