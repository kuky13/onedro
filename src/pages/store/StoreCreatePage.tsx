// @ts-nocheck
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Store, Check, AlertCircle } from 'lucide-react';
import { useStoreStore } from './useStoreStore';
const storeSchema = z.object({
  name: z.string().min(3, 'Nome da loja deve ter pelo menos 3 caracteres'),
  slug: z.string().min(3, 'URL deve ter pelo menos 3 caracteres').max(20, 'URL deve ter no máximo 20 caracteres').regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
  phone: z.string().min(10, 'Telefone inválido'),
  whatsapp: z.string().optional(),
  warranty_days: z.coerce.number().min(0, 'Dias de garantia deve ser positivo').default(90),
  delivery_available: z.boolean().default(false)
});
type StoreFormValues = z.infer<typeof storeSchema>;
export default function StoreCreatePage() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    setCurrentStore
  } = useStoreStore();
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: '',
      slug: '',
      phone: '',
      whatsapp: '',
      warranty_days: 90,
      delivery_available: false
    }
  });
  const checkSlug = async (slug: string) => {
    if (slug.length < 3) return;
    setIsCheckingSlug(true);
    try {
      const {
        data,
        error
      } = await supabase.from('stores').select('id').eq('slug', slug).maybeSingle();
      if (error && error.code !== '42P01') {
        // Ignore "relation does not exist" for demo
        console.error(error);
      }
      setSlugAvailable(!data);
    } catch (error) {
      console.error(error);
      setSlugAvailable(true); // Assume available if table missing for demo
    } finally {
      setIsCheckingSlug(false);
    }
  };
  const onSubmit = async (data: StoreFormValues) => {
    if (!user) return;
    try {
      const {
        data: store,
        error
      } = await supabase.from('stores').insert({
        owner_id: user.id,
        name: data.name,
        slug: data.slug,
        contact_info: {
          phone: data.phone,
          whatsapp: data.whatsapp || data.phone
        },
        policies: {
          warranty_days: data.warranty_days,
          delivery_available: data.delivery_available
        },
        theme_config: {
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
          priceColor: '#ffffff',
          font: 'Inter',
          whatsappMessageTemplate: 'Olá, tenho interesse no produto {NOME}. Preço: {PRECO}'
        }
      }).select().single();
      if (error) {
        if (error.code === '42P01') {
          toast.error('Tabela "stores" não encontrada. Execute o script SQL fornecido.');
        } else {
          toast.error('Erro ao criar loja: ' + error.message);
        }
        return;
      }
      setCurrentStore(store);
      toast.success('Loja criada com sucesso!');
      navigate('/store/painel');
    } catch (error) {
      console.error(error);
      toast.error('Erro inesperado ao criar loja');
    }
  };
  return <div className="container max-w-2xl mx-auto py-10 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Criar sua Loja Virtual</CardTitle>
              <CardDescription>Configure os dados básicos da sua loja para começar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="name" render={({
              field
            }) => <FormItem>
                    <FormLabel>Nome da Loja</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Tech Solutions" {...field} onChange={e => {
                  field.onChange(e);
                  // Auto-generate slug
                  const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                  form.setValue('slug', slug);
                  checkSlug(slug);
                }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="slug" render={({
              field
            }) => <FormItem>
                    <FormLabel>Endereço Personalizado</FormLabel>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">/loja/</span>
                      <FormControl>
                        <Input placeholder="tech-solutions" {...field} onChange={e => {
                    field.onChange(e);
                    checkSlug(e.target.value);
                  }} />
                      </FormControl>
                      {isCheckingSlug ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : slugAvailable === true ? <Check className="w-4 h-4 text-green-500" /> : slugAvailable === false ? <AlertCircle className="w-4 h-4 text-destructive" /> : null}
                    </div>
                    <FormDescription>
                      Seu link será: {window.location.origin}/loja/{field.value || '...'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({
                field
              }) => <FormItem>
                      <FormLabel>Telefone Principal</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
                <FormField control={form.control} name="whatsapp" render={({
                field
              }) => {}} />
              </div>

              

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || slugAvailable === false}>
                {form.formState.isSubmitting ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando Loja...
                  </> : 'Criar Minha Loja'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>;
}