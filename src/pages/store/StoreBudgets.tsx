// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStoreStore } from './useStoreStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Filter, Plus, FileText, MessageCircle, Phone, Pencil, ExternalLink, Store, Trash2 } from 'lucide-react';
import { HamsterLoader } from '@/components/ui/hamster-loader';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useMediaQuery } from '@/hooks/use-media-query';

const NewBudgetForm = ({ value, onChange }: { value: any, onChange: (val: any) => void }) => (
  <div className="grid gap-4 py-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Cliente *</Label>
        <Input 
          id="name" 
          value={value.customer_name}
          onChange={(e) => onChange({...value, customer_name: e.target.value})}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input 
          id="phone" 
          placeholder="(00) 00000-0000"
          value={value.customer_phone}
          onChange={(e) => onChange({...value, customer_phone: e.target.value})}
        />
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="device">Modelo do Aparelho *</Label>
      <Input 
        id="device" 
        placeholder="Ex: iPhone 11"
        value={value.device_model}
        onChange={(e) => onChange({...value, device_model: e.target.value})}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="problem">Descrição do Problema</Label>
      <Textarea 
        id="problem" 
        placeholder="Ex: Tela quebrada, não carrega..."
        value={value.problem_description}
        onChange={(e) => onChange({...value, problem_description: e.target.value})}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="amount">Valor Estimado (R$)</Label>
      <Input 
        id="amount" 
        type="number" 
        placeholder="0.00"
        value={value.total_amount}
        onChange={(e) => onChange({...value, total_amount: e.target.value})}
      />
    </div>
  </div>
);

interface Budget {
  id: string;
  customer_name: string;
  customer_phone: string;
  device_model: string;
  problem_description: string;
  status: string;
  total_amount: number;
  created_at: string;
  public_token: string;
}

export default function StoreBudgets() {
  const { currentStore } = useStoreStore();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const availableStatuses = ['pending','approved','rejected','in_progress','completed','sent'];
  
  // New Budget Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newBudget, setNewBudget] = useState({
    customer_name: '',
    customer_phone: '',
    device_model: '',
    problem_description: '',
    total_amount: ''
  });

  useEffect(() => {
    if (currentStore) {
      fetchBudgets();
    }
  }, [currentStore]);

  const fetchBudgets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_budgets')
        .select('*')
        .eq('store_id', currentStore.id)
        .order('created_at', { ascending: false });

      if (error) {
         if (error.code !== '42P01') console.error(error);
      } else {
        setBudgets(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyStoreLink = () => {
    if (!currentStore) return;
    const link = `${window.location.origin}/loja/${currentStore.slug}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Link da loja copiado!');
    });
  };

  const handleOpenNewBudget = () => {
    setEditingId(null);
    setNewBudget({
      customer_name: '',
      customer_phone: '',
      device_model: '',
      problem_description: '',
      total_amount: ''
    });
    setIsDialogOpen(true);
  };

  const handleEditClick = (budget: Budget) => {
    setNewBudget({
      customer_name: budget.customer_name,
      customer_phone: budget.customer_phone,
      device_model: budget.device_model,
      problem_description: budget.problem_description || '',
      total_amount: budget.total_amount ? budget.total_amount.toString() : ''
    });
    setEditingId(budget.id);
    setIsDetailsOpen(false);
    setIsDialogOpen(true);
  };

  const handleSaveBudget = async () => {
    if (!newBudget.customer_name || !newBudget.device_model) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('store_budgets')
          .update({
            customer_name: newBudget.customer_name,
            customer_phone: newBudget.customer_phone,
            device_model: newBudget.device_model,
            problem_description: newBudget.problem_description,
            total_amount: parseFloat(newBudget.total_amount) || 0,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Orçamento atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('store_budgets')
          .insert({
            store_id: currentStore.id,
            customer_name: newBudget.customer_name,
            customer_phone: newBudget.customer_phone,
            device_model: newBudget.device_model,
            problem_description: newBudget.problem_description,
            total_amount: parseFloat(newBudget.total_amount) || 0,
            status: 'pending'
          });

        if (error) throw error;
        toast.success('Orçamento criado com sucesso!');
      }

      setIsDialogOpen(false);
      setEditingId(null);
      setNewBudget({
        customer_name: '',
        customer_phone: '',
        device_model: '',
        problem_description: '',
        total_amount: ''
      });
      fetchBudgets(); // Refresh list
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao salvar orçamento: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
      case 'approved': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      case 'sent': return 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Recusado',
      in_progress: 'Em Andamento',
      completed: 'Concluído',
      sent: 'Enviado'
    };
    return labels[status] || status;
  };

  const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

  const getWhatsAppLink = (phone: string, message?: string) => {
    const digits = normalizePhone(phone);
    const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
    const text = message ? encodeURIComponent(message) : '';
    return `https://wa.me/${withCountry}${text ? `?text=${text}` : ''}`;
  };

  const updateBudgetStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('store_budgets')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      toast.success('Status atualizado para ' + getStatusLabel(status));
      fetchBudgets();
      if (selectedBudget && selectedBudget.id === id) {
        setSelectedBudget({ ...selectedBudget, status });
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao atualizar status: ' + e.message);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      const { error } = await supabase
        .from('store_budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Orçamento excluído com sucesso');
      setBudgets(prev => prev.filter(b => b.id !== id));
      
      if (selectedBudget?.id === id) {
        setSelectedBudget(null);
        setIsDetailsOpen(false);
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao excluir orçamento: ' + error.message);
    }
  };

  const filteredBudgets = budgets.filter(b => 
    b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.device_model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const BudgetDetailsContent = () => {
    if (!selectedBudget) return null;
    return (
      <div className="space-y-4 px-4 sm:px-0">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Cliente</Label>
            <div className="font-medium">{selectedBudget.customer_name}</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedBudget.customer_phone}</span>
              {selectedBudget.customer_phone && (
                <Button
                  variant="link"
                  size="sm"
                  className="px-0 h-auto"
                  onClick={() => {
                    const msg = `Olá ${selectedBudget.customer_name}, sobre seu orçamento do ${selectedBudget.device_model}.`;
                    const url = getWhatsAppLink(selectedBudget.customer_phone, msg);
                    window.open(url, '_blank');
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                </Button>
              )}
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <div>
              <Badge variant="outline" className={getStatusColor(selectedBudget.status)}>
                {getStatusLabel(selectedBudget.status)}
              </Badge>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Select value={selectedBudget.status} onValueChange={(v) => updateBudgetStatus(selectedBudget.id, v)}>
                <SelectTrigger className="h-8 w-40">
                  <SelectValue placeholder="Alterar status" />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map(s => (
                    <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBudget.status !== 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  onClick={() => updateBudgetStatus(selectedBudget.id, 'pending')}
                >
                  Reverter
                </Button>
              )}
            </div>
          </div>
        </div>

        <div>
          <Label>Aparelho</Label>
          <div>{selectedBudget.device_model}</div>
        </div>
        <div>
          <Label>Problema</Label>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedBudget.problem_description || '-'}</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Criado em</Label>
            <div>{new Date(selectedBudget.created_at).toLocaleString()}</div>
          </div>
          <div>
            <Label>Valor</Label>
            <div>
              {selectedBudget.total_amount ?
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedBudget.total_amount) : '-'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orçamentos</h2>
          <p className="text-muted-foreground">Gerencie as solicitações de orçamento da sua loja</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={() => window.open(`/loja/${currentStore?.slug}`, '_blank')}>
            <ExternalLink className="h-4 w-4" /> Ver Loja
          </Button>
          {isDesktop ? (
          <>
            <Button onClick={handleOpenNewBudget} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Orçamento
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar Orçamento' : 'Criar Novo Orçamento'}</DialogTitle>
                  <DialogDescription>
                    {editingId ? 'Edite os dados do orçamento.' : 'Adicione um orçamento manualmente para um cliente de balcão ou telefone.'}
                  </DialogDescription>
                </DialogHeader>
                <NewBudgetForm value={newBudget} onChange={setNewBudget} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveBudget} disabled={isSubmitting}>
                    {isSubmitting ? <HamsterLoader size="sm" className="mr-2" /> : null}
                    {editingId ? 'Salvar Alterações' : 'Criar Orçamento'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <>
            <Button onClick={handleOpenNewBudget} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Orçamento
            </Button>
            <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>{editingId ? 'Editar Orçamento' : 'Criar Novo Orçamento'}</DrawerTitle>
                  <DrawerDescription>
                    {editingId ? 'Edite os dados do orçamento.' : 'Adicione um orçamento manualmente para um cliente de balcão ou telefone.'}
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4"><NewBudgetForm value={newBudget} onChange={setNewBudget} /></div>
                <DrawerFooter>
                  <Button onClick={handleSaveBudget} disabled={isSubmitting}>
                    {isSubmitting ? <HamsterLoader size="sm" className="mr-2" /> : null}
                    {editingId ? 'Salvar Alterações' : 'Criar Orçamento'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </>
        )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Pedidos</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar cliente ou aparelho..." 
                  className="pl-8" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="hidden sm:inline-flex">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <HamsterLoader size="md" className="mx-auto" />
            </div>
          ) : filteredBudgets.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">Nenhum orçamento encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Compartilhe o link da sua loja ou crie um novo orçamento manualmente.
              </p>
              <Button variant="outline" onClick={copyStoreLink}>
                Copiar Link da Loja
              </Button>
            </div>
          ) : (
            <>
            <div className="sm:hidden space-y-4">
              {filteredBudgets.map((budget) => (
                <div key={budget.id} className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                  <div className="p-4 space-y-4">
                    {/* Header: Name, Date, Badge */}
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="font-semibold text-base">{budget.customer_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(budget.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="outline" className={`${getStatusColor(budget.status)} whitespace-nowrap`}>
                        {getStatusLabel(budget.status)}
                      </Badge>
                    </div>

                    {/* Contact Links */}
                    {(budget.customer_phone) && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => {
                            const msg = `Olá ${budget.customer_name}, sobre seu orçamento do ${budget.device_model}.`;
                            const url = getWhatsAppLink(budget.customer_phone, msg);
                            window.open(url, '_blank');
                          }}
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-green-600" /> WhatsApp
                        </Button>
                        <a
                          href={`tel:${normalizePhone(budget.customer_phone)}`}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 gap-1.5"
                        >
                          <Phone className="h-3.5 w-3.5" /> Ligar
                        </a>
                      </div>
                    )}

                    {/* Device & Price Info */}
                    <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-2 border border-border/50">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-medium text-foreground">{budget.device_model}</span>
                        <span className="font-bold text-primary whitespace-nowrap">
                          {budget.total_amount ? 
                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.total_amount) 
                            : '-'}
                        </span>
                      </div>
                      {budget.problem_description && (
                        <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                          {budget.problem_description}
                        </p>
                      )}
                    </div>

                    {/* Status Control */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Atualizar Status</Label>
                      <Select value={budget.status} onValueChange={(v) => updateBudgetStatus(budget.id, v)}>
                        <SelectTrigger className="w-full h-9 bg-background">
                          <SelectValue placeholder="Alterar status" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStatuses.map(s => (
                            <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Actions Footer */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleEditClick(budget)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => { setSelectedBudget(budget); setIsDetailsOpen(true); }}
                      >
                        Detalhes
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 mt-1 h-8"
                      onClick={() => handleDeleteBudget(budget.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-md border hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Cliente</TableHead>
                    <TableHead>Aparelho</TableHead>
                    <TableHead>Problema</TableHead>
                    <TableHead className="w-[200px]">Status</TableHead>
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead className="text-right w-[120px]">Valor</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBudgets.map((budget) => (
                    <TableRow key={budget.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium align-top py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-base">{budget.customer_name}</span>
                          <div className="flex items-center gap-2">
                            {budget.customer_phone ? (
                              <>
                                <span className="text-xs text-muted-foreground">{budget.customer_phone}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => {
                                    const msg = `Olá ${budget.customer_name}, sobre seu orçamento do ${budget.device_model}.`;
                                    const url = getWhatsAppLink(budget.customer_phone, msg);
                                    window.open(url, '_blank');
                                  }}
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Sem telefone</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-4 font-medium">
                        {budget.device_model}
                      </TableCell>
                      <TableCell className="align-top py-4 max-w-[200px]">
                        <p className="truncate text-sm text-muted-foreground" title={budget.problem_description}>
                          {budget.problem_description || <span className="italic opacity-50">Sem descrição</span>}
                        </p>
                      </TableCell>
                      <TableCell className="align-top py-4">
                        <div className="space-y-2">
                          <Badge variant="outline" className={`${getStatusColor(budget.status)} w-fit`}>
                            {getStatusLabel(budget.status)}
                          </Badge>
                          <Select value={budget.status} onValueChange={(v) => updateBudgetStatus(budget.id, v)}>
                            <SelectTrigger className="h-8 w-full text-xs bg-background">
                              <SelectValue placeholder="Alterar" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableStatuses.map(s => (
                                <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-4 text-sm text-muted-foreground">
                        {new Date(budget.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right align-top py-4 font-semibold">
                        {budget.total_amount ? 
                          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.total_amount) 
                          : <span className="text-muted-foreground font-normal">-</span>}
                      </TableCell>
                      <TableCell className="text-right align-top py-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditClick(budget)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => { setSelectedBudget(budget); setIsDetailsOpen(true); }}
                          >
                            Detalhes
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteBudget(budget.id)}
                            title="Excluir"
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
            </>
          )}
        </CardContent>
      </Card>
      {isDesktop ? (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle>Detalhes do Orçamento</DialogTitle>
              <DialogDescription>
                Informações completas do pedido selecionado.
              </DialogDescription>
            </DialogHeader>
            <BudgetDetailsContent />
            <DialogFooter>
              {selectedBudget && (
                <Button variant="secondary" onClick={() => handleEditClick(selectedBudget)}>
                  <Pencil className="h-4 w-4 mr-2" /> Editar
                </Button>
              )}
              {selectedBudget && selectedBudget.status !== 'sent' && (
                <Button
                  variant="default"
                  onClick={() => updateBudgetStatus(selectedBudget!.id, 'sent')}
                >
                  Marcar como Enviado
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Detalhes do Orçamento</DrawerTitle>
              <DrawerDescription>
                Informações completas do pedido selecionado.
              </DrawerDescription>
            </DrawerHeader>
            <div className="max-h-[80vh] overflow-y-auto">
              <BudgetDetailsContent />
            </div>
            <DrawerFooter>
              {selectedBudget && (
                <Button variant="secondary" onClick={() => handleEditClick(selectedBudget)}>
                  <Pencil className="h-4 w-4 mr-2" /> Editar
                </Button>
              )}
              {selectedBudget && selectedBudget.status !== 'sent' && (
                <Button
                  variant="default"
                  onClick={() => updateBudgetStatus(selectedBudget!.id, 'sent')}
                >
                  Marcar como Enviado
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Fechar</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
