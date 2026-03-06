import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Key, Plus, Edit, Trash2, Eye, EyeOff, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  service_name: string;
  api_key: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const SERVICES = [
  { value: 'anthropic', label: 'Anthropic (Claude)', description: 'Claude AI API - Anthropic' },
  { value: 'deepseek', label: 'DeepSeek', description: 'DeepSeek AI API' },
  { value: 'gemini', label: 'Google Gemini (Direct)', description: 'Google Gemini API Direct' },
  { value: 'openai', label: 'OpenAI', description: 'OpenAI GPT API' },
];

export function ApiKeysManager() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [deletingKey, setDeletingKey] = useState<ApiKey | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  // Form state
  const [formService, setFormService] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [showFormKey, setShowFormKey] = useState(false);

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ApiKey[];
    },
  });

  const addKeyMutation = useMutation({
    mutationFn: async (newKey: { service_name: string; api_key: string; description: string; is_active: boolean }) => {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id ?? null;

      const { error } = await supabase
        .from('api_keys')
        .insert({
          ...newKey,
          created_by: userId,
          updated_by: userId,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('API Key adicionada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      resetForm();
      setShowAddDialog(false);
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar API Key: ${error.message}`);
    },
  });

  const updateKeyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ApiKey> }) => {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id ?? null;
      
      const { error } = await supabase
        .from('api_keys')
        .update({ ...updates, updated_by: userId } as any)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('API Key atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      resetForm();
      setEditingKey(null);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar API Key: ${error.message}`);
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('API Key removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setDeletingKey(null);
    },
    onError: (error) => {
      toast.error(`Erro ao remover API Key: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormService('');
    setFormApiKey('');
    setFormDescription('');
    setFormIsActive(true);
    setShowFormKey(false);
  };

  const handleAddKey = () => {
    if (!formService || !formApiKey) {
      toast.error('Serviço e API Key são obrigatórios');
      return;
    }

    addKeyMutation.mutate({
      service_name: formService,
      api_key: formApiKey,
      description: formDescription,
      is_active: formIsActive,
    });
  };

  const handleEditKey = (key: ApiKey) => {
    setEditingKey(key);
    setFormService(key.service_name);
    setFormApiKey(key.api_key);
    setFormDescription(key.description || '');
    setFormIsActive(key.is_active);
  };

  const handleUpdateKey = () => {
    if (!editingKey || !formApiKey) {
      toast.error('API Key é obrigatória');
      return;
    }

    updateKeyMutation.mutate({
      id: editingKey.id,
      updates: {
        api_key: formApiKey,
        description: formDescription,
        is_active: formIsActive,
      },
    });
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Gerenciamento de API Keys</AlertTitle>
        <AlertDescription>
          Configure suas próprias API Keys para provedores de IA externos. O Lovable AI já está pré-configurado e não
          requer chave adicional.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys Cadastradas
              </CardTitle>
              <CardDescription>Gerencie suas chaves API para provedores externos</CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Chave
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!apiKeys || apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma API key cadastrada</p>
              <p className="text-sm">Adicione uma chave para usar provedores externos</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Chave API</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium capitalize">{key.service_name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          {visibleKeys[key.id] ? key.api_key : maskApiKey(key.api_key)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleKeyVisibility(key.id)}
                            className="h-6 w-6 p-0"
                          >
                            {visibleKeys[key.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {key.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={key.is_active ? 'default' : 'secondary'} className="gap-1">
                          {key.is_active ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              Ativa
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              Inativa
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(key.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditKey(key)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingKey(key)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog || !!editingKey} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingKey(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingKey ? 'Editar API Key' : 'Adicionar Nova API Key'}</DialogTitle>
            <DialogDescription>
              {editingKey
                ? 'Atualize os dados da API Key existente'
                : 'Adicione uma nova chave API para uso com provedores externos'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="service">Serviço *</Label>
              <Select value={formService} onValueChange={setFormService} disabled={!!editingKey}>
                <SelectTrigger id="service">
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICES.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{service.label}</span>
                        <span className="text-xs text-muted-foreground">{service.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key *</Label>
              <div className="relative">
                <Input
                  id="api_key"
                  type={showFormKey ? "text" : "password"}
                  placeholder="Cole sua API key aqui"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowFormKey(!showFormKey)}
                >
                  {showFormKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição opcional (ex: Chave para ambiente de produção)"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Chave ativa
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingKey(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={editingKey ? handleUpdateKey : handleAddKey}
              disabled={addKeyMutation.isPending || updateKeyMutation.isPending}
            >
              {addKeyMutation.isPending || updateKeyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : editingKey ? (
                'Atualizar'
              ) : (
                'Adicionar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingKey} onOpenChange={(open) => !open && setDeletingKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a API Key do serviço{' '}
              <strong>{deletingKey?.service_name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingKey && deleteKeyMutation.mutate(deletingKey.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteKeyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
