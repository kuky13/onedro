
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Eye, RefreshCw, FileText, User, CreditCard, Key, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useIsMobile } from '@/hooks/useResponsive';

interface PurchaseRegistration {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_tax_id?: string;
  amount: number | null;
  status: string | null;
  plan_type: string | null;
  license_code: string | null;
  license_id: string | null;
  payment_method: string | null;
  mercadopago_payment_id: string | null; // Used as AbacatePay ID
  metadata: any;
  licenses?: {
    is_active: boolean;
    expires_at: string | null;
  } | null;
}

export function AbacateSalesManagement() {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<PurchaseRegistration | null>(null);

  const {
    data: sales = [],
    isLoading: salesLoading,
    refetch: refetchSales
  } = useQuery<PurchaseRegistration[]>({
    queryKey: ['superadmin-abacate-sales'],
    queryFn: async () => {
      const { data, error } = await supabase.
      from('purchase_registrations').
      select(`
          id, 
          created_at, 
          customer_name, 
          customer_email, 
          customer_phone, 
          customer_tax_id,
          amount, 
          status, 
          plan_type, 
          license_code, 
          license_id, 
          payment_method, 
          mercadopago_payment_id,
          metadata,
          licenses (is_active, expires_at)
        `).
      order('created_at', { ascending: false });

      if (error) throw error;
      return data as PurchaseRegistration[];
    }
  });

  const filteredSales = sales.filter((sale) => {
    const search = searchTerm.toLowerCase();
    return (
      sale.customer_name?.toLowerCase().includes(search) ||
      sale.customer_email?.toLowerCase().includes(search) ||
      sale.license_code?.toLowerCase().includes(search) ||
      sale.mercadopago_payment_id?.toLowerCase().includes(search) ||
      sale.customer_tax_id?.includes(search));

  });

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    // Fix: AbacatePay stores amounts in cents (integers), so we divide by 100.
    // If the value is > 2000, we assume it's in cents to avoid formatting float values (like 350.00) incorrectly.
    // However, considering the user report of "R$ 35.000,00" for "R$ 350,00", it's clearly cents.
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <ShoppingBag className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl lg:text-3xl font-bold tracking-tight">Abacate Pay - Vendas</h1>
        <p className="text-sm lg:text-base text-muted-foreground">
          Relatório completo e detalhado de todas as transações via Abacate Pay.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Histórico de Vendas</CardTitle>
            <CardDescription>Visualize e audite todas as vendas registradas.</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              
              <Input
                placeholder="Buscar por nome, email, licença, ID..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} />
              
            </div>
            <Button variant="outline" size="icon" onClick={() => refetchSales()} disabled={salesLoading}>
              <RefreshCw className={`h-4 w-4 ${salesLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isMobile ?
          <div className="space-y-4">
              {salesLoading &&
            <div className="flex justify-center items-center py-8 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Carregando vendas...
                </div>
            }
              
              {!salesLoading && filteredSales.length === 0 &&
            <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma venda encontrada.
                </div>
            }

              {!salesLoading && filteredSales.map((sale) =>
            <Card key={sale.id} className="bg-muted/30 border-border/60">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{sale.customer_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{sale.customer_email}</div>
                      </div>
                      <div className="text-right shrink-0">
                         <div className="text-xs font-medium">{new Date(sale.created_at).toLocaleDateString('pt-BR')}</div>
                         <div className="text-[10px] text-muted-foreground">{new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor</span>
                        <span className="font-medium">{formatCurrency(sale.amount)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                         <Badge variant={sale.status === 'completed' || sale.status === 'approved' ? 'default' : 'secondary'} className="text-[10px] h-5">
                            {sale.status}
                          </Badge>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                       <div className="min-w-0 flex-1">
                         {sale.license_code ?
                    <code className="text-xs bg-background px-1.5 py-0.5 rounded border font-mono block truncate w-fit max-w-full">
                             {sale.license_code}
                           </code> :

                    <span className="text-xs text-muted-foreground italic">Sem licença</span>
                    }
                       </div>
                       <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedSale(sale)}>
                         <Eye className="h-3.5 w-3.5 mr-1.5" />
                         Detalhes
                       </Button>
                    </div>
                  </CardContent>
                </Card>
            )}
            </div> :

          <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Licença</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesLoading &&
                <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                          <RefreshCw className="h-4 w-4 animate-spin" /> Carregando vendas...
                        </div>
                      </TableCell>
                    </TableRow>
                }

                  {!salesLoading && filteredSales.length === 0 &&
                <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Nenhuma venda encontrada.
                      </TableCell>
                    </TableRow>
                }

                  {!salesLoading && filteredSales.map((sale) =>
                <TableRow key={sale.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium">{new Date(sale.created_at).toLocaleDateString('pt-BR')}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{sale.customer_name}</div>
                        <div className="text-[10px] text-muted-foreground">{sale.customer_email}</div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {formatCurrency(sale.amount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={sale.status === 'completed' || sale.status === 'approved' ? 'default' : 'secondary'} className="text-[10px]">
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {sale.license_code || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedSale(sale)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                )}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes da Venda
            </DialogTitle>
            <DialogDescription>
              ID Interno: <span className="font-mono text-xs">{selectedSale?.id}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedSale &&
          <div className="space-y-6 py-4">
              {/* Status Banner */}
              <div className={`p-4 rounded-lg border flex items-center justify-between ${
            selectedSale.status === 'completed' || selectedSale.status === 'approved' ?
            'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' :
            'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300'}`
            }>
                <div className="flex flex-col">
                  <span className="text-xs uppercase font-bold tracking-wider opacity-70">Status do Pagamento</span>
                  <span className="font-bold text-lg">{selectedSale.status?.toUpperCase() || 'PENDENTE'}</span>
                </div>
                <div className="text-right">
                   <span className="text-xs opacity-70">Valor Total</span>
                   <div className="font-bold text-xl">{formatCurrency(selectedSale.amount)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dados do Cliente */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                    <User className="h-4 w-4" /> Dados do Cliente
                  </h3>
                  <div className="bg-muted/40 p-3 rounded-md space-y-2 text-sm border">
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-muted-foreground text-xs">Nome:</span>
                      <span className="col-span-2 font-medium">{selectedSale.customer_name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-muted-foreground text-xs">Email:</span>
                      <span className="col-span-2 break-all">{selectedSale.customer_email}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-muted-foreground text-xs">Telefone:</span>
                      <span className="col-span-2 font-mono">{selectedSale.customer_phone}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-muted-foreground text-xs">CPF/CNPJ:</span>
                      <span className="col-span-2 font-mono">{selectedSale.customer_tax_id || 'Não informado'}</span>
                    </div>
                  </div>
                </div>

                {/* Dados do Pagamento */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                    <CreditCard className="h-4 w-4" /> Dados do Pagamento
                  </h3>
                  <div className="bg-muted/40 p-3 rounded-md space-y-2 text-sm border">
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-muted-foreground text-xs">ID Abacate:</span>
                      <span className="col-span-2 font-mono text-xs break-all">{selectedSale.mercadopago_payment_id || '—'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-muted-foreground text-xs">Método:</span>
                      <span className="col-span-2 capitalize">{selectedSale.payment_method || 'PIX'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-muted-foreground text-xs">Data:</span>
                      <span className="col-span-2">{formatDate(selectedSale.created_at)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-muted-foreground text-xs">Plano:</span>
                      <span className="col-span-2 capitalize">{selectedSale.plan_type}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dados da Licença */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                  <Key className="h-4 w-4" /> Dados da Licença
                </h3>
                <div className="bg-muted/40 p-4 rounded-md border flex flex-col md:flex-row gap-4 justify-between items-center">
                   <div className="text-center md:text-left">
                     <span className="text-xs text-muted-foreground block mb-1">Código da Licença</span>
                     <code className="bg-background px-3 py-1.5 rounded border font-mono text-lg font-bold tracking-widest">
                       {selectedSale.license_code || 'AGUARDANDO GERAÇÃO'}
                     </code>
                   </div>
                   
                   {selectedSale.licenses &&
                <div className="flex items-center gap-4 text-sm">
                       <div className="flex flex-col items-center md:items-end">
                         <span className="text-xs text-muted-foreground">Status</span>
                         <Badge variant={selectedSale.licenses.is_active ? 'default' : 'destructive'}>
                           {selectedSale.licenses.is_active ? 'Ativa' : 'Inativa'}
                         </Badge>
                       </div>
                       <div className="flex flex-col items-center md:items-end">
                         <span className="text-xs text-muted-foreground">Expira em</span>
                         <span className="font-medium flex items-center gap-1">
                           <Calendar className="h-3 w-3" />
                           {selectedSale.licenses.expires_at ? new Date(selectedSale.licenses.expires_at).toLocaleDateString('pt-BR') : 'Vitalício?'}
                         </span>
                       </div>
                     </div>
                }
                </div>
              </div>

              {/* Metadata JSON */}
              <div className="space-y-2">
                 <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Metadados Técnicos</h3>
                 <ScrollArea className="h-32 rounded-md border bg-slate-950 text-slate-50 p-4 font-mono text-xs">
                   <pre>{JSON.stringify(selectedSale.metadata, null, 2)}</pre>
                 </ScrollArea>
              </div>

            </div>
          }
        </DialogContent>
      </Dialog>
    </div>);

}