import { useEffect, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useStoreStore } from './useStoreStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Save, Palette, Store, Smartphone, Upload, ImageIcon, MessageCircle, Link, Copy, Check, ExternalLink, Wrench } from 'lucide-react';

const settingsSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  slug: z.string().min(3, 'URL deve ter no mínimo 3 caracteres').regex(/^[a-z0-9-]+$/, 'URL deve conter apenas letras minúsculas, números e hífens'),
  description: z.string().optional(),
  phone: z.string().min(10, 'Telefone inválido'),
  whatsapp: z.string().optional(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor inválida'),
  secondaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  surfaceColor: z.string().optional(),
  textColor: z.string().optional(),
  iconColor: z.string().optional(),
  borderColor: z.string().optional(),
  mutedColor: z.string().optional(),
  dangerColor: z.string().optional(),
  warningColor: z.string().optional(),
  successColor: z.string().optional(),
  logo_url: z.string().optional(),
  banner_url: z.string().optional(),
  priceColor: z.string().optional(),
  whatsappMessageTemplate: z.string().optional(),
  whatsappServiceMessageTemplate: z.string().optional()
});
type SettingsFormValues = z.infer<typeof settingsSchema>;
export default function StoreSettings() {
  const {
    currentStore,
    setCurrentStore
  } = useStoreStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [copied, setCopied] = useState(false);
  
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      phone: '',
      whatsapp: '',
      primaryColor: '#fec832',
      secondaryColor: '#ffffff',
      backgroundColor: '#131313',
      surfaceColor: '#242424',
      textColor: '#ffffff',
      iconColor: '#fec832',
      borderColor: '#ffffff',
      mutedColor: '#ffffff',
      dangerColor: '#ef4444',
      warningColor: '#ff0000',
      successColor: '#10b981',
      logo_url: '',
      banner_url: '',
      priceColor: '#ffffff',
      whatsappMessageTemplate: 'Oi tenho interesse nesse produto: {NOME}. Preço: {PRECO}',
      whatsappServiceMessageTemplate: 'Olá! Tenho interesse nesse reparo: {SERVICO}\nAparelho: {APARELHO}\nÀ vista: {PRECOAVISTA}\nNo cartão: {PRECOPARCELADO}\nGarantia: {GARANTIA}'
    }
  });

  const slugValue = form.watch('slug');
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/loja/` : '/loja/';
  const fullStoreUrl = `${baseUrl}${slugValue || 'sua-loja'}`;

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.length < 3 || !currentStore) return;
    
    setSlugStatus('checking');
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', slug)
        .neq('id', currentStore.id)
        .maybeSingle();
      
      if (error) throw error;
      setSlugStatus(data ? 'taken' : 'available');
    } catch (error) {
      console.error('Error checking slug:', error);
      setSlugStatus('idle');
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (slugValue && slugValue !== currentStore?.slug) {
        checkSlugAvailability(slugValue);
      } else {
        setSlugStatus('idle');
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [slugValue, currentStore?.slug]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullStoreUrl);
      setCopied(true);
      toast.success('URL copiada!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar URL');
    }
  };
  useEffect(() => {
    if (currentStore) {
      const contact = (currentStore.contact_info as any) || {};
      const theme = (currentStore.theme_config as any) || {};

      form.reset({
        name: currentStore.name,
        slug: currentStore.slug || '',
        description: currentStore.description || '',
        phone: contact.phone || '',
        whatsapp: contact.whatsapp || '',
        primaryColor: theme.primaryColor || '#fec832',
        secondaryColor: theme.secondaryColor || '#ffffff',
        backgroundColor: theme.backgroundColor || '#131313',
        surfaceColor: theme.surfaceColor || '#242424',
        textColor: theme.textColor || '#ffffff',
        iconColor: theme.iconColor || theme.textColor || '#fec832',
        borderColor: theme.borderColor || '#ffffff',
        mutedColor: theme.mutedColor || '#ffffff',
        dangerColor: theme.dangerColor || '#ef4444',
        warningColor: theme.warningColor || '#ff0000',
        successColor: theme.successColor || '#10b981',
        logo_url: currentStore.logo_url || '',
        banner_url: currentStore.banner_url || '',
        priceColor: theme.priceColor || '#000000',
        whatsappMessageTemplate: theme.whatsappMessageTemplate || 'Olá, tenho interesse no produto {NOME}. Preço: {PRECO}',
        whatsappServiceMessageTemplate: theme.whatsappServiceMessageTemplate || 'Olá! Tenho interesse no serviço: {SERVICO}\nAparelho: {APARELHO}\nÀ vista: {PRECOAVISTA}\nNo cartão: {PRECOPARCELADO}\nGarantia: {GARANTIA}'
      });
    }
  }, [currentStore, form]);
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `logos/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('store_assets').upload(filePath, file);
      if (uploadError) throw uploadError;
      const {
        data
      } = supabase.storage.from('store_assets').getPublicUrl(filePath);
      form.setValue('logo_url', data.publicUrl);
      toast.success('Logo enviada com sucesso!');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao enviar imagem: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };
  const onSubmit = async (data: SettingsFormValues) => {
    if (!currentStore) return;
    
    if (slugStatus === 'taken') {
      toast.error('Esta URL já está em uso. Escolha outra.');
      return;
    }
    
    setIsLoading(true);
    try {
      const currentTheme = (currentStore.theme_config as any) || {};

      const updates = {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        logo_url: data.logo_url || null,
        banner_url: data.banner_url || null,
        contact_info: {
          phone: data.phone,
          whatsapp: data.whatsapp || data.phone,
        },
        theme_config: {
          ...currentTheme,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          backgroundColor: data.backgroundColor,
          surfaceColor: data.surfaceColor,
          textColor: data.textColor,
          iconColor: data.iconColor || data.textColor || '#fec832',
          borderColor: data.borderColor || '#ffffff',
          mutedColor: data.mutedColor || '#ffffff',
          dangerColor: data.dangerColor || '#ef4444',
          warningColor: data.warningColor || '#ff0000',
          successColor: data.successColor || '#10b981',
          priceColor: data.priceColor,
          whatsappMessageTemplate: data.whatsappMessageTemplate,
          whatsappServiceMessageTemplate: data.whatsappServiceMessageTemplate,
        },
      };

      console.log('Saving store settings:', updates);
      const { error } = await supabase.from('stores').update(updates).eq('id', currentStore.id);
      if (error) throw error;

      setCurrentStore({
        ...(currentStore as any),
        ...(updates as any),
      });

      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações da Loja</h2>
        <p className="text-muted-foreground">Personalize a aparência e informações da sua loja virtual</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Geral & Contato</TabsTrigger>
              <TabsTrigger value="appearance">Aparência & Cores</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Informações Básicas</CardTitle>
                  <CardDescription>Dados visíveis para seus clientes na página inicial</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="name" render={({
                  field
                }) => <FormItem><FormLabel>Nome da Loja</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="description" render={({
                  field
                }) => <FormItem><FormLabel>Descrição / Slogan</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Link className="h-5 w-5" /> URL da Loja</CardTitle>
                  <CardDescription>Personalize o endereço da sua loja virtual</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField 
                    control={form.control} 
                    name="slug" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Identificador da URL</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              placeholder="minha-loja"
                              className={`pr-10 ${
                                slugStatus === 'available' ? 'border-green-500 focus-visible:ring-green-500' : 
                                slugStatus === 'taken' ? 'border-destructive focus-visible:ring-destructive' : ''
                              }`}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {slugStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                              {slugStatus === 'available' && <Check className="h-4 w-4 text-green-500" />}
                              {slugStatus === 'taken' && <span className="text-xs text-destructive font-medium">Em uso</span>}
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Use apenas letras minúsculas, números e hífens (ex: minha-loja-celulares)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  
                  {/* URL Preview and Copy */}
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ExternalLink className="h-4 w-4" />
                      <span>Sua loja ficará disponível em:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-background rounded-md border px-3 py-2 text-sm font-mono overflow-x-auto">
                        <span className="text-muted-foreground">{baseUrl}</span>
                        <span className="text-foreground font-semibold">{slugValue || 'sua-loja'}</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={copyToClipboard}
                        className="shrink-0"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> Contato</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="phone" render={({
                  field
                }) => <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="whatsapp" render={({
                  field
                }) => <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Mensagem de Produtos</CardTitle>
                  <CardDescription>Mensagem enviada via WhatsApp quando o cliente clicar em um produto</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField 
                    control={form.control} 
                    name="whatsappMessageTemplate" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo de Mensagem</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Olá, tenho interesse no produto {NOME}. Preço: {PRECO}"
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormDescription className="text-xs space-y-1">
                          <p>Variáveis disponíveis:</p>
                          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                            <li><code className="bg-muted px-1 rounded">{'{NOME}'}</code> - Nome do produto</li>
                            <li><code className="bg-muted px-1 rounded">{'{PRECO}'}</code> - Preço do produto</li>
                          </ul>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  
                  <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>Prévia:</span>
                    </div>
                    <div className="bg-background rounded-md border px-3 py-2 text-sm text-muted-foreground">
                      {(form.watch('whatsappMessageTemplate') || 'Olá, tenho interesse no produto {NOME}. Preço: {PRECO}')
                        .replace('{NOME}', 'iPhone 15 Pro')
                        .replace('{PRECO}', 'R$ 6.999,00')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Mensagem de Serviços</CardTitle>
                  <CardDescription>Mensagem enviada via WhatsApp quando o cliente clicar em um serviço de reparo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField 
                    control={form.control} 
                    name="whatsappServiceMessageTemplate" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo de Mensagem</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Olá! Tenho interesse no serviço: {SERVICO}. Aparelho: {APARELHO}. À vista: {PRECOAVISTA}. No cartão: {PRECOPARCELADO}"
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormDescription className="text-xs space-y-1">
                          <p>Variáveis disponíveis:</p>
                          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                            <li><code className="bg-muted px-1 rounded">{'{SERVICO}'}</code> - Nome do serviço</li>
                            <li><code className="bg-muted px-1 rounded">{'{APARELHO}'}</code> - Marca e modelo</li>
                            <li><code className="bg-muted px-1 rounded">{'{PRECOAVISTA}'}</code> - Preço à vista</li>
                            <li><code className="bg-muted px-1 rounded">{'{PRECOPARCELADO}'}</code> - Preço parcelado (ex: 4x de R$ 70,00)</li>
                            <li><code className="bg-muted px-1 rounded">{'{GARANTIA}'}</code> - Garantia do serviço</li>
                          </ul>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  
                  <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>Prévia:</span>
                    </div>
                    <div className="bg-background rounded-md border px-3 py-2 text-sm text-muted-foreground whitespace-pre-line">
                      {(form.watch('whatsappServiceMessageTemplate') || 'Olá! Tenho interesse no serviço: {SERVICO}\nAparelho: {APARELHO}\nÀ vista: {PRECOAVISTA}\nNo cartão: {PRECOPARCELADO}\nGarantia: {GARANTIA}')
                        .replace('{SERVICO}', 'Troca de Tela')
                        .replace('{APARELHO}', 'Samsung Galaxy S24')
                        .replace('{PRECOAVISTA}', 'R$ 450,00')
                        .replace('{PRECOPARCELADO}', '4x de R$ 125,00')
                        .replace('{PRECO}', 'R$ 450,00')
                        .replace('{GARANTIA}', '3 meses')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Identidade Visual</CardTitle>
                  
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* Logo Upload Section */}
                  <div className="space-y-4 pb-6 border-b">
                    <FormField control={form.control} name="logo_url" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Logo da Loja</FormLabel>
                          <div className="flex flex-col sm:flex-row items-start gap-4">
                            <div className="h-24 w-24 shrink-0 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50 overflow-hidden relative mx-auto sm:mx-0">
                              {field.value ? <img src={field.value} alt="Logo Preview" className="h-full w-full object-contain" /> : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
                            </div>
                            <div className="space-y-3 flex-1 w-full">
                              <FormControl>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Input type="file" accept="image/*" className="hidden" id="logo-upload" onChange={handleFileUpload} disabled={isUploading} />
                                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => document.getElementById('logo-upload')?.click()} disabled={isUploading}>
                                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Carregar
                                  </Button>
                                  <Input placeholder="Ou cole a URL..." {...field} className="flex-1" />
                                </div>
                              </FormControl>
                              <FormDescription className="text-xs text-center sm:text-left">Recomendado: PNG transparente, 200x200px</FormDescription>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>} />
                  </div>

                  {/* Colors Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField control={form.control} name="primaryColor" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Cor Primária</FormLabel>
                        <div className="flex gap-2 items-center">
                          <div className="relative">
                            <Input type="color" className="h-10 w-12 p-1 cursor-pointer" {...field} />
                          </div>
                          <Input {...field} className="font-mono" />
                        </div>
                        <FormDescription className="text-xs">Botões e destaques principais</FormDescription>
                        <FormMessage />
                      </FormItem>} />

                    <FormField control={form.control} name="backgroundColor" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Cor de Fundo</FormLabel>
                        <div className="flex gap-2 items-center">
                          <div className="relative">
                            <Input type="color" className="h-10 w-12 p-1 cursor-pointer" {...field} />
                          </div>
                          <Input {...field} className="font-mono" />
                        </div>
                        <FormDescription className="text-xs">Background geral da página</FormDescription>
                        <FormMessage />
                      </FormItem>} />

                    <FormField control={form.control} name="surfaceColor" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Cor dos Cartões</FormLabel>
                        <div className="flex gap-2 items-center">
                          <div className="relative">
                            <Input type="color" className="h-10 w-12 p-1 cursor-pointer" {...field} />
                          </div>
                          <Input {...field} className="font-mono" />
                        </div>
                        <FormDescription className="text-xs">Fundo de áreas de conteúdo</FormDescription>
                        <FormMessage />
                      </FormItem>} />

                    <FormField control={form.control} name="textColor" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Cor do Texto</FormLabel>
                        <div className="flex gap-2 items-center">
                          <div className="relative">
                            <Input type="color" className="h-10 w-12 p-1 cursor-pointer" {...field} />
                          </div>
                          <Input {...field} className="font-mono" />
                        </div>
                        <FormDescription className="text-xs">Cor principal de leitura</FormDescription>
                        <FormMessage />
                      </FormItem>} />

                    <FormField control={form.control} name="iconColor" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Cor dos Ícones</FormLabel>
                        <div className="flex gap-2 items-center">
                          <div className="relative">
                            <Input type="color" className="h-10 w-12 p-1 cursor-pointer" {...field} />
                          </div>
                          <Input {...field} className="font-mono" />
                        </div>
                        <FormDescription className="text-xs">Cor de ícones secundários</FormDescription>
                        <FormMessage />
                      </FormItem>} />

                    <FormField control={form.control} name="mutedColor" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Cor Secundária</FormLabel>
                        <div className="flex gap-2 items-center">
                          <div className="relative">
                            <Input type="color" className="h-10 w-12 p-1 cursor-pointer" {...field} />
                          </div>
                          <Input {...field} className="font-mono" />
                        </div>
                        <FormDescription className="text-xs">Textos de apoio e detalhes</FormDescription>
                        <FormMessage />
                      </FormItem>} />

                    <FormField control={form.control} name="borderColor" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Cor das Bordas</FormLabel>
                        <div className="flex gap-2 items-center">
                          <div className="relative">
                            <Input type="color" className="h-10 w-12 p-1 cursor-pointer" {...field} />
                          </div>
                          <Input {...field} className="font-mono" />
                        </div>
                        <FormDescription className="text-xs">Divisórias e contornos</FormDescription>
                        <FormMessage />
                      </FormItem>} />

                    <FormField control={form.control} name="warningColor" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Cor de Aviso</FormLabel>
                        <div className="flex gap-2 items-center">
                          <div className="relative">
                            <Input type="color" className="h-10 w-12 p-1 cursor-pointer" {...field} />
                          </div>
                          <Input {...field} className="font-mono" />
                        </div>
                        <FormDescription className="text-xs">Alertas e avisos importantes</FormDescription>
                        <FormMessage />
                      </FormItem>} />

                    <FormField control={form.control} name="priceColor" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Cor do Preço</FormLabel>
                        <div className="flex gap-2 items-center">
                          <div className="relative">
                            <Input type="color" className="h-10 w-12 p-1 cursor-pointer" {...field} />
                          </div>
                          <Input {...field} className="font-mono" />
                        </div>
                        <FormDescription className="text-xs">Cor específica do preço nos produtos</FormDescription>
                        <FormMessage />
                      </FormItem>} />
                  </div>



                  {/* Preview Section */}
                  <div className="mt-6">
                    <p className="text-sm font-medium mb-2">Pré-visualização</p>
                    <div className="rounded-lg border p-4 sm:p-6 transition-colors duration-300" style={{
                    backgroundColor: form.watch('backgroundColor'),
                    color: form.watch('textColor')
                  }}>
                      <div className="p-4 rounded-lg shadow-sm max-w-sm mx-auto transition-colors duration-300 border" style={{
                      backgroundColor: form.watch('surfaceColor'),
                      borderColor: form.watch('borderColor')
                    }}>
                        <div className="h-10 w-10 rounded-full mb-3 flex items-center justify-center transition-colors duration-300" style={{
                        backgroundColor: `${form.watch('primaryColor')}20`
                      }}>
                          <Store className="h-5 w-5" style={{
                          color: form.watch('iconColor') || form.watch('primaryColor')
                        }} />
                        </div>
                        <h3 className="font-bold text-lg mb-1">Título do Cartão</h3>
                        <p className="text-sm mb-4" style={{
                        color: form.watch('mutedColor')
                      }}>Este é um exemplo de como os cartões e textos ficarão na sua loja.</p>
                        <Button style={{
                        backgroundColor: form.watch('primaryColor'),
                        color: form.watch('secondaryColor')
                      }} className="w-full transition-colors duration-300">
                          Botão de Ação
                        </Button>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end sticky bottom-4 z-10 bg-background/95 backdrop-blur-xl p-4 border rounded-xl shadow-lg mt-8">
            <Button type="submit" size="lg" disabled={isLoading} className="w-full sm:w-auto h-12 px-8 text-base font-medium shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]">
              {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando...</> : <><Save className="mr-2 h-5 w-5" /> Salvar Alterações</>}
            </Button>
          </div>
        </form>
      </Form>
    </div>;
}