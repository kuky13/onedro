import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, Smartphone, MessageCircle, ArrowLeft } from 'lucide-react';

interface PublicOrderStatus {
  id: string;
  sequential_number: number;
  device_model: string;
  status: string;
  entry_date: string;
  updated_at: string;
  shop_name: string;
  shop_phone: string;
}

export const OrderStatusPage = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<PublicOrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        // Call the RPC function created in migration
        const { data, error } = await supabase.rpc('get_public_os_status', { p_order_id: id });

        if (error) throw error;

        if (data && data.length > 0) {
          setOrder(data[0]);
        } else {
          setError('Ordem de serviço não encontrada.');
        }
      } catch (err: any) {
        console.error('Erro ao buscar status:', err);
        setError('Não foi possível carregar o status. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [id]);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('pronto') || s.includes('concluído')) return 'bg-green-500 hover:bg-green-600';
    if (s.includes('aguardando') || s.includes('pendente')) return 'bg-yellow-500 hover:bg-yellow-600';
    if (s.includes('andamento') || s.includes('bancada')) return 'bg-blue-500 hover:bg-blue-600';
    if (s.includes('cancelado')) return 'bg-red-500 hover:bg-red-600';
    return 'bg-gray-500 hover:bg-gray-600';
  };

  const formatWhatsAppLink = (phone: string, orderNum: string | number) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá, gostaria de saber mais sobre a Ordem de Serviço #${orderNum}.`);
    return `https://wa.me/55${cleanPhone}?text=${message}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="flex flex-col items-center pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Ops!</h2>
            <p className="text-red-600 dark:text-red-300 mb-6">{error || 'Ordem de serviço não encontrada'}</p>
            <Link to="/">
              <Button variant="outline">Voltar ao Início</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 md:pt-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/" className="text-primary hover:underline flex items-center gap-1 text-sm font-medium">
            <ArrowLeft className="h-4 w-4" /> OneDrip
          </Link>
          {order.shop_name && (
            <span className="text-sm font-semibold text-muted-foreground truncate max-w-[200px]">
              {order.shop_name}
            </span>
          )}
        </div>

        {/* Main Card */}
        <Card className="overflow-hidden border-primary/20 shadow-lg">
          <div className="bg-primary/5 p-6 text-center border-b border-primary/10">
            <h1 className="text-2xl font-bold text-primary mb-1">
              OS #{order.sequential_number || order.id.slice(0, 8)}
            </h1>
            <Badge className={`mt-2 text-white px-4 py-1 text-base capitalize ${getStatusColor(order.status)}`}>
              {order.status}
            </Badge>
          </div>
          
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Aparelho</span>
                <div className="flex items-center gap-2 font-medium">
                  <Smartphone className="h-4 w-4 text-primary" />
                  {order.device_model}
                </div>
              </div>
              
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Data Entrada</span>
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4 text-primary" />
                  {new Date(order.entry_date).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border/50">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Última Atualização</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.updated_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground pt-2 border-t border-border/50">
                Acompanhe o status do seu reparo em tempo real através desta página.
              </p>
            </div>

            {order.shop_phone && (
              <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white" asChild>
                <a 
                  href={formatWhatsAppLink(order.shop_phone, order.sequential_number || order.id)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" />
                  Falar com Técnico no WhatsApp
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Monitoramento via OneDrip System
        </p>
      </div>
    </div>
  );
};
