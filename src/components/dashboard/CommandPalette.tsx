import { useState, useEffect } from 'react';
import { 
  Calculator, 
  Search, 
  FileText, 
  MessageCircle, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface CommandPaletteProps {
  onNavigate?: (section: string, id?: string) => void;
}

interface Budget {
  id: string;
  client_name: string;
  total_price: number;
  created_at: string;
}

interface Client {
  client_name: string;
}

export const CommandPalette = ({ onNavigate }: CommandPaletteProps) => {
  const [open, setOpen] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const { profile } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    const fetchRecentData = async () => {
      if (!profile?.id) return;

      try {
        const { data: budgetData } = await supabase
          .from('budgets')
          .select('id, client_name, total_price, created_at')
          .eq('owner_id', profile.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5);

        if (budgetData) {
          setBudgets(budgetData.map(budget => ({
            id: budget.id,
            client_name: budget.client_name || 'Cliente não informado',
            total_price: budget.total_price,
            created_at: budget.created_at
          })));
        }

        const { data: clientsData } = await supabase
          .from('budgets')
          .select('client_name')
          .eq('owner_id', profile.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(10);

        if (clientsData) {
          const uniqueClients = Array.from(
            new Set(clientsData.map(item => item.client_name).filter(Boolean))
          ).slice(0, 5);
          setClients(uniqueClients.map(name => ({ client_name: name as string })));
        }
      } catch (error) {
        console.error('Erro ao buscar dados recentes:', error);
      }
    };

    if (open) {
      fetchRecentData();
    }
  }, [open, profile?.id]);

  const handleWormAccess = () => {
    setOpen(false);
    window.location.href = '/worm';
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Pesquisar...</span>
        <span className="inline-flex lg:hidden">Pesquisar</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Digite um comando ou busque algo..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          
          <CommandGroup heading="Sistema">
            <CommandItem onSelect={handleWormAccess}>
              <Calculator className="mr-2 h-4 w-4" />
              <span>Acessar Worm System (Orçamentos)</span>
              <ChevronRight className="ml-auto h-4 w-4" />
            </CommandItem>
            <CommandItem onSelect={() => {
              setOpen(false);
              onNavigate?.('dashboard');
            }}>
              <TrendingUp className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
          </CommandGroup>

          {budgets.length > 0 && (
            <CommandGroup heading="Orçamentos Recentes">
              {budgets.map((budget) => (
                <CommandItem
                  key={budget.id}
                  onSelect={() => {
                    setOpen(false);
                    window.location.href = '/worm';
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{budget.client_name}</span>
                    <span className="text-xs text-muted-foreground">
                      R$ {(budget.total_price / 100).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {clients.length > 0 && (
            <CommandGroup heading="Clientes Recentes">
              {clients.map((client) => (
                <CommandItem
                  key={client.client_name}
                  onSelect={() => {
                    setOpen(false);
                    window.location.href = '/worm';
                  }}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  <span>{client.client_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Ações Rápidas">
            <CommandItem onSelect={handleWormAccess}>
              <Calculator className="mr-2 h-4 w-4" />
              <span>Criar Novo Orçamento</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
};