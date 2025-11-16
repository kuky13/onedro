import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, User, Phone } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface NewClientData {
  name: string;
  phone: string;
  email?: string;
}

interface WormClientSelectorProps {
  selectedClientId?: string | null;
  onClientSelect: (client: Client | null, clientId?: string) => void;
  placeholder?: string;
}

export const WormClientSelector = ({ 
  selectedClientId, 
  onClientSelect, 
  placeholder = "Selecione um cliente" 
}: WormClientSelectorProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [newClientData, setNewClientData] = useState<NewClientData>({
    name: '',
    phone: '',
    email: ''
  });

  // Buscar clientes do usuário
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['worm-clients', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, email')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Mutation para criar novo cliente
  const createClientMutation = useMutation({
    mutationFn: async (clientData: NewClientData) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('clients')
        .insert([{
          ...clientData,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newClient) => {
      toast.success('Cliente criado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['worm-clients'] });
      onClientSelect(newClient, newClient.id);
      setIsNewClientOpen(false);
      setNewClientData({ name: '', phone: '', email: '' });
    },
    onError: (error) => {
      console.error('Erro ao criar cliente:', error);
      toast.error('Erro ao criar cliente');
    }
  });

  const handleCreateClient = () => {
    if (!newClientData.name || !newClientData.phone) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    createClientMutation.mutate(newClientData);
  };

  const handleClientSelect = (clientId: string) => {
    if (clientId === 'new') {
      setIsNewClientOpen(true);
      return;
    }

    const selectedClient = clients.find(c => c.id === clientId);
    onClientSelect(selectedClient || null, clientId);
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="space-y-2">
      <Label>Cliente</Label>
      
      <Select 
        value={selectedClientId || ''} 
        onValueChange={handleClientSelect}
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Carregando..." : placeholder}>
            {selectedClient && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{selectedClient.name}</span>
                {selectedClient.phone && (
                  <span className="text-muted-foreground text-sm">
                    • {selectedClient.phone}
                  </span>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="new" className="text-primary">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Criar novo cliente</span>
            </div>
          </SelectItem>
          
          {clients.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs text-muted-foreground border-b">
                Clientes existentes
              </div>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  <div className="flex items-center gap-2 w-full">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{client.name}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{client.phone}</span>
                        {client.email && (
                          <>
                            <span>•</span>
                            <span className="truncate">{client.email}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

      {/* Dialog para criar novo cliente */}
      <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-client-name">Nome *</Label>
              <Input
                id="new-client-name"
                value={newClientData.name}
                onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo do cliente"
                autoFocus
              />
            </div>
            
            <div>
              <Label htmlFor="new-client-phone">Telefone *</Label>
              <Input
                id="new-client-phone"
                value={newClientData.phone}
                onChange={(e) => setNewClientData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
            
            <div>
              <Label htmlFor="new-client-email">Email (opcional)</Label>
              <Input
                id="new-client-email"
                type="email"
                value={newClientData.email}
                onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="cliente@email.com"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsNewClientOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateClient}
                disabled={createClientMutation.isPending}
              >
                {createClientMutation.isPending ? 'Criando...' : 'Criar Cliente'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};