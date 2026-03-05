import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface LicenseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    license_code: string;
    expires_at: string;
    activated_at: string;
    is_active: boolean;
    notes?: string;
  } | null;
  onSuccess: () => void;
}

export const LicenseEditModal = ({ isOpen, onClose, license, onSuccess }: LicenseEditModalProps) => {
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    license_code: '',
    expires_at: new Date(),
    is_active: true,
    notes: '',
    action_type: 'edit' as 'edit' | 'extend' | 'transfer'
  });
  const [extendDays, setExtendDays] = useState(30);
  const [transferUserId, setTransferUserId] = useState('');
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, name: string, email: string}>>([]);

  useEffect(() => {
    if (license) {
      // Validar e garantir que expires_at seja uma data válida
      let expiresAt = new Date();
      if (license.expires_at) {
        const parsedDate = new Date(license.expires_at);
        if (!isNaN(parsedDate.getTime())) {
          expiresAt = parsedDate;
        } else {
          // Se a data for inválida, usar data atual + 30 dias como padrão
          expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
      } else {
        // Se expires_at for null/undefined, usar data atual + 30 dias
        expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
      
      setFormData({
        license_code: license.license_code,
        expires_at: expiresAt,
        is_active: license.is_active,
        notes: license.notes || '',
        action_type: 'edit'
      });
    }
  }, [license]);

  useEffect(() => {
    if (isOpen) {
      loadAvailableUsers();
    }
  }, [isOpen]);

  const loadAvailableUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_all_users');
      if (error) throw error;
      const users = (data || []).map((user: any) => ({
        id: user.id,
        name: user.email || user.id,
        email: user.email
      }));
      setAvailableUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
      setAvailableUsers([]);
    }
  };

  const handleSave = async () => {
    if (!license) return;
    
    // Validação da data de expiração
    if (formData.action_type === 'edit' && formData.expires_at < new Date()) {
      showError({
        title: 'Erro de Validação',
        description: 'A data de expiração não pode ser anterior à data atual.'
      });
      return;
    }
    
    setIsLoading(true);
    try {
      let result;
      
      switch (formData.action_type) {
        case 'edit':
          // Usar admin_update_license para edição completa
          result = await supabase.rpc('admin_update_license', {
            p_license_id: license.id,
            p_license_code: formData.license_code,
            p_expires_at: formData.expires_at.toISOString(),
            p_is_active: formData.is_active,
            p_notes: formData.notes || ''
          });
          break;
          
        case 'extend':
          result = await supabase.rpc('admin_extend_license', {
            p_license_id: license.id,
            p_extend_days: extendDays
          });
          break;
          
        case 'transfer':
          if (!transferUserId) {
            showError({
              title: 'Erro',
              description: 'Selecione um usuário para transferir a licença.'
            });
            return;
          }
          result = await supabase.rpc('admin_transfer_license', {
            p_license_id: license.id,
            p_new_user_id: transferUserId
          });
          
          // Verificar se a função retornou um erro no JSON
          if (result?.data && typeof result.data === 'object' && 'success' in result.data && !(result.data as any).success) {
            throw new Error((result.data as any).error || 'Erro ao transferir licença');
          }
          break;
      }
      
      if (result?.error) throw result.error;
      
      showSuccess({
        title: 'Sucesso',
        description: 'Licença atualizada com sucesso!'
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      showError({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar licença'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewLicenseCode = () => {
    const code = Math.random().toString(36).substring(2, 15).toUpperCase();
    setFormData(prev => ({ ...prev, license_code: code }));
  };

  if (!license) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant={license.is_active ? 'default' : 'secondary'}>
              {license.is_active ? 'Ativa' : 'Inativa'}
            </Badge>
            Editar Licença - {license.user_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações do Usuário */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Informações do Usuário</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nome:</span>
                <p className="font-medium">{license.user_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{license.user_email}</p>
              </div>
            </div>
          </div>

          {/* Tipo de Ação */}
          <div className="space-y-2">
            <Label>Tipo de Ação</Label>
            <Select value={formData.action_type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, action_type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="edit">Editar Licença</SelectItem>
                <SelectItem value="extend">Estender Validade</SelectItem>
                <SelectItem value="transfer">Transferir Licença</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campos baseados no tipo de ação */}
          {formData.action_type === 'edit' && (
            <>
              <div className="space-y-2">
                <Label>Código da Licença</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.license_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, license_code: e.target.value }))}
                    placeholder="Código da licença"
                    readOnly
                  />
                  <Button type="button" variant="outline" onClick={generateNewLicenseCode}>
                    Gerar Novo
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data de Expiração</Label>
                <div className="space-y-3">
                  {/* Data atual de expiração */}
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    <span className="text-sm text-muted-foreground">Data atual:</span>
                    <p className="font-medium">
                      {license.expires_at && !isNaN(new Date(license.expires_at).getTime()) 
                        ? format(new Date(license.expires_at), "PPP 'às' HH:mm", { locale: ptBR })
                        : 'Data inválida'
                      }
                    </p>
                  </div>
                  
                  {/* Seletor de calendário */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.expires_at && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.expires_at && !isNaN(formData.expires_at.getTime()) 
                          ? format(formData.expires_at, "PPP", { locale: ptBR }) 
                          : "Selecionar data"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.expires_at}
                        onSelect={(date) => {
                          if (date) {
                            // Manter a hora atual ao selecionar nova data
                            const currentTime = formData.expires_at;
                            date.setHours(currentTime.getHours(), currentTime.getMinutes());
                            setFormData(prev => ({ ...prev, expires_at: date }));
                          }
                        }}
                        initialFocus
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {/* Campo de entrada de data e hora */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Data (DD/MM/AAAA)</Label>
                      <Input
                        type="date"
                        value={formData.expires_at && !isNaN(formData.expires_at.getTime()) 
                          ? format(formData.expires_at, "yyyy-MM-dd")
                          : format(new Date(), "yyyy-MM-dd")
                        }
                        onChange={(e) => {
                          const newDate = new Date(e.target.value);
                          newDate.setHours(formData.expires_at.getHours(), formData.expires_at.getMinutes());
                          setFormData(prev => ({ ...prev, expires_at: newDate }));
                        }}
                        min={format(new Date(), "yyyy-MM-dd")}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Hora (HH:MM)</Label>
                      <Input
                        type="time"
                        value={formData.expires_at && !isNaN(formData.expires_at.getTime()) 
                          ? format(formData.expires_at, "HH:mm")
                          : "23:59"
                        }
        onChange={(e) => {
          const [hours, minutes] = e.target.value.split(':');
          const newDate = new Date(formData.expires_at);
          newDate.setHours(parseInt(hours || '0', 10), parseInt(minutes || '0', 10));
          setFormData(prev => ({ ...prev, expires_at: newDate }));
        }}
                      />
                    </div>
                  </div>
                  
                  {/* Feedback visual da nova data */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Nova data de expiração:</span>
                    <p className="font-medium text-blue-800 dark:text-blue-200">
                      {formData.expires_at && !isNaN(formData.expires_at.getTime()) 
                        ? format(formData.expires_at, "PPP 'às' HH:mm", { locale: ptBR })
                        : 'Data inválida'
                      }
                    </p>
                  </div>
                </div>
              </div>


            </>
          )}

          {formData.action_type === 'extend' && (
            <div className="space-y-2">
              <Label>Estender por (dias)</Label>
              <Select value={extendDays.toString()} onValueChange={(value) => setExtendDays(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="365">1 ano</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Nova data de expiração: {format(new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000), "PPP", { locale: ptBR })}
              </p>
            </div>
          )}

          {formData.action_type === 'transfer' && (
            <div className="space-y-2">
              <Label>Transferir para Usuário</Label>
              <Select value={transferUserId} onValueChange={setTransferUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id || ''}>
                        {user.name} ({user.email})
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {transferUserId && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded border border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">
                    Esta ação transferirá a licença permanentemente para o usuário selecionado.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas (Opcional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Adicione observações sobre esta alteração..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};