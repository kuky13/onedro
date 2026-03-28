import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Bot, Brain, Building2, Globe, MessageSquare, Save, Loader2, Sparkles, Trash2, Info } from 'lucide-react';
import { ProductCatalogCard } from './ProductCatalogCard';
import { clearAllMessages } from '@/services/chatMemoryService';

const DEFAULT_AWAY_MESSAGE = 'eu não consegui entender o comando irei passar para um atendente nesse instante';

const DEFAULT_TOPICS = {
  budgets: true,
  service_orders: true,
  clients: true,
  store: true,
  company_info: true,
};

const PERSONALITY_OPTIONS = [
  { value: 'friendly', label: '😊 Amigável', desc: 'Tom acolhedor e próximo' },
  { value: 'formal', label: '👔 Formal', desc: 'Tom profissional e sério' },
  { value: 'casual', label: '😎 Descontraído', desc: 'Tom leve e informal' },
  { value: 'neutral', label: '🤖 Neutro', desc: 'Tom objetivo e direto' },
  { value: 'empathetic', label: '💛 Empático', desc: 'Tom compreensivo e atencioso' },
];

const TOPIC_LABELS: Record<string, { label: string; desc: string }> = {
  budgets: { label: 'Orçamentos', desc: 'Consultar status, valores e detalhes de orçamentos' },
  service_orders: { label: 'Ordens de Serviço', desc: 'Status de reparos, histórico e previsões' },
  clients: { label: 'Clientes', desc: 'Dados cadastrais e histórico do cliente' },
  store: { label: 'Loja / Produtos', desc: 'Disponibilidade, preços e detalhes de produtos' },
  company_info: { label: 'Informações da Empresa', desc: 'Endereço, horário, contato e mais' },
};

export function IAConfigManager() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const ownerId = user?.id ?? null;

  // IA Config query
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['ia-config', ownerId],
    enabled: Boolean(ownerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_configs')
        .select('*')
        .eq('owner_id', ownerId as string)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data ?? null;
    },
  });

  // Company info query
  const { data: companyData, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['company-info-ia', ownerId],
    enabled: Boolean(ownerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_info')
        .select('name, address, whatsapp_phone, email, business_hours, description')
        .eq('owner_id', ownerId as string)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data ?? null;
    },
  });

  // IA states
  const [aiName, setAiName] = useState('Drippy');
  const [personality, setPersonality] = useState('formal');
  const [awayMessage, setAwayMessage] = useState(DEFAULT_AWAY_MESSAGE);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [activeTopics, setActiveTopics] = useState(DEFAULT_TOPICS);
  const [customKnowledge, setCustomKnowledge] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Company states
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyHours, setCompanyHours] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');

  // Sync IA config
  useEffect(() => {
    if (!config) return;
    setAiName(config.ai_name || 'Drippy');
    setPersonality(config.personality || 'friendly');
    setAwayMessage(config.away_message || DEFAULT_AWAY_MESSAGE);
    setWebSearchEnabled(config.web_search_enabled || false);
    setActiveTopics((config.active_topics as any) || DEFAULT_TOPICS);
    setCustomKnowledge(config.custom_knowledge || '');
  }, [config]);

  // Sync company info
  useEffect(() => {
    if (!companyData) return;
    setCompanyName(companyData.name || '');
    setCompanyAddress(companyData.address || '');
    setCompanyPhone(companyData.whatsapp_phone || '');
    setCompanyEmail(companyData.email || '');
    setCompanyHours(companyData.business_hours || '');
    setCompanyDescription(companyData.description || '');
  }, [companyData]);

  const toggleTopic = (key: string) => {
    setActiveTopics((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!ownerId) throw new Error('Usuário não autenticado');

      // Save IA config
      const iaPayload = {
        owner_id: ownerId,
        ai_name: aiName.trim() || 'Drippy',
        personality,
        away_message: awayMessage.trim() || DEFAULT_AWAY_MESSAGE,
        web_search_enabled: webSearchEnabled,
        active_topics: activeTopics,
        custom_knowledge: customKnowledge.trim() || null,
      };

      const { error: iaError } = await supabase
        .from('ia_configs')
        .upsert(iaPayload as any, { onConflict: 'owner_id' });
      if (iaError) throw iaError;

      // Save company info
      const companyPayload = {
        owner_id: ownerId,
        name: companyName.trim() || 'Minha Empresa',
        address: companyAddress.trim() || null,
        whatsapp_phone: companyPhone.trim() || null,
        email: companyEmail.trim() || null,
        business_hours: companyHours.trim() || null,
        description: companyDescription.trim() || null,
      };

      const { error: companyError } = await supabase
        .from('company_info')
        .upsert(companyPayload as any, { onConflict: 'owner_id' });
      if (companyError) throw companyError;
    },
    onSuccess: () => {
      showSuccess({ title: 'Configurações salvas', description: 'IA e informações da empresa atualizadas.' });
      queryClient.invalidateQueries({ queryKey: ['ia-config'] });
      queryClient.invalidateQueries({ queryKey: ['company-info-ia'] });
    },
    onError: (err: any) => showError({ title: 'Erro ao salvar', description: err.message }),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!ownerId) throw new Error('Usuário não autenticado');
      return clearAllMessages(ownerId);
    },
    onSuccess: () => {
      showSuccess({ title: 'Histórico limpo', description: 'Todas as mensagens foram removidas.' });
      setShowClearConfirm(false);
    },
    onError: (err: any) => showError({ title: 'Erro ao limpar', description: err.message }),
  });

  if (isLoadingConfig || isLoadingCompany) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Persona */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Persona da IA
          </CardTitle>
          <CardDescription>Defina como sua IA se apresenta e se comporta no WhatsApp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="ai-name">Nome da IA</Label>
            <Input
              id="ai-name"
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              placeholder="Drippy"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">Como a IA vai se apresentar nas conversas.</p>
          </div>

          <div className="grid gap-2">
            <Label>Tom de Voz</Label>
            <Select value={personality} onValueChange={setPersonality}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERSONALITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      {opt.label}
                      <span className="text-xs text-muted-foreground">— {opt.desc}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="away-msg">Mensagem de Ausência</Label>
            <Textarea
              id="away-msg"
              value={awayMessage}
              onChange={(e) => setAwayMessage(e.target.value)}
              placeholder={DEFAULT_AWAY_MESSAGE}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Resposta quando a IA não consegue processar.</p>
          </div>
        </CardContent>
      </Card>

      {/* Informações da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Informações da Empresa
          </CardTitle>
          <CardDescription>
            A IA usará esses dados para responder perguntas sobre sua empresa no WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="company-name">Nome da Empresa</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Oliveira Imports"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-phone">WhatsApp / Telefone</Label>
              <Input
                id="company-phone"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="(64) 99999-9999"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="company-address">Endereço</Label>
            <Input
              id="company-address"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder="Rua Exemplo, 123 - Centro, Cidade - UF"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="company-email">Email</Label>
              <Input
                id="company-email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-hours">Horário de Atendimento</Label>
              <Input
                id="company-hours"
                value={companyHours}
                onChange={(e) => setCompanyHours(e.target.value)}
                placeholder="Seg-Sex 8h-18h, Sáb 8h-12h"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="company-desc">Descrição / Sobre</Label>
            <Textarea
              id="company-desc"
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
              placeholder="Assistência técnica especializada em smartphones e tablets..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tópicos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Tópicos e Conhecimento
          </CardTitle>
          <CardDescription>Escolha sobre o que sua IA pode consultar e responder. Tópicos desativados serão completamente bloqueados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(TOPIC_LABELS).map(([key, { label, desc }]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
              <Switch
                checked={activeTopics[key as keyof typeof activeTopics] ?? true}
                onCheckedChange={() => toggleTopic(key)}
              />
            </div>
          ))}

          <Separator />

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <div>
                <div className="text-sm font-medium text-foreground">Pesquisa na Web</div>
                <div className="text-xs text-muted-foreground">
                  Busca informações externas (especificações, preços de mercado, etc.)
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {webSearchEnabled && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="mr-1 h-3 w-3" /> Ativo
                </Badge>
              )}
              <Switch checked={webSearchEnabled} onCheckedChange={setWebSearchEnabled} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Base de Conhecimento + Tabela de Preços */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Base de Conhecimento e Tabela de Preços
          </CardTitle>
          <CardDescription>
            Adicione sua tabela de preços, políticas e informações que a IA deve usar para responder clientes no WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Catálogo da Loja:</strong> Os serviços e produtos cadastrados na sua Loja são automaticamente incluídos no contexto da IA. Use este campo para complementar com preços extras, condições especiais ou regras de negócio.
            </p>
          </div>
          <Textarea
            value={customKnowledge}
            onChange={(e) => setCustomKnowledge(e.target.value)}
            placeholder={`Exemplos de tabela de preços e regras:\n\nTroca de tela iPhone 14: R$ 350,00 (prazo: 1 dia útil)\nTroca de tela Samsung S23: R$ 280,00\nTroca de bateria (qualquer modelo): R$ 80,00 - R$ 150,00\nConsertar conector de carga: R$ 120,00\n\nDescontos:\n- 10% no pagamento à vista (PIX/dinheiro)\n- Parcelamento em até 3x sem juros no cartão\n\nPolíticas:\n- Garantia de 90 dias em peças e serviços\n- Não fazemos reparos em notebooks (só smartphones/tablets)\n- Avaliação gratuita no balcão (sem compromisso)`}
            rows={10}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Use texto simples ou Markdown. Quando um cliente perguntar sobre preços, a IA consultará essas informações e responderá automaticamente. Se o serviço não estiver na lista, a IA transfere para atendimento humano.
          </p>
        </CardContent>
      </Card>

      {/* Catálogo de Produtos */}
      <ProductCatalogCard />

      {/* Limpeza de Histórico */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Limpar Histórico
          </CardTitle>
          <CardDescription>
            Remove todas as mensagens e contexto da IA armazenados (útil para testes).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowClearConfirm(true)}
            disabled={clearMutation.isPending}
            variant="destructive"
            size="sm"
          >
            {clearMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Limpando...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Histórico
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Diálogo de Confirmação */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogTitle>Limpar Histórico de Mensagens?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação removerá todas as mensagens e contexto armazenado da IA. Isso não pode ser desfeito.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Limpar Tudo
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          size="lg"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
