import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useFormAutoSave } from "@/hooks/useAutoSave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WormClientSelector } from "./WormClientSelector";
import { toast } from "sonner";
import { getRandomAiSuccessMessage } from "@/utils/aiMessages";
import { ScrollIndicator } from "@/components/ui/ScrollIndicator";
import { Loader2, Phone, Smartphone, CheckCircle, FileText, X } from "lucide-react";
import { BudgetPartsSection } from "./BudgetPartsSection";
import type { BudgetPart } from "@/hooks/worm/useBudgetParts";
const budgetSchema = z.object({
  client_id: z.string().optional(),
  client_name: z.string().optional(),
  client_phone: z.string().optional(),
  device_type: z.string().min(1, "Tipo do dispositivo é obrigatório"),
  device_model: z.string().min(1, "Modelo do dispositivo é obrigatório"),
  issue: z.string().optional(),
  part_quality: z.string().optional(),
  total_price: z.number().min(0, "Preço deve ser maior que zero"),
  cash_price: z.number().optional(),
  installment_price: z.number().optional(),
  installments: z.number().min(1).optional(),
  payment_condition: z.string().optional(),
  warranty_months: z.number().min(0).optional(),
  notes: z.string().max(100, "Observações devem ter no máximo 100 caracteres").optional(),
  includes_delivery: z.boolean().optional(),
  includes_screen_protector: z.boolean().optional(),
  custom_services: z.string().optional(),
  enable_installment_price: z.boolean().optional(),
  // Dias de validade do orçamento (1 a 365)
  validity_days: z.coerce.number().min(1, "Mínimo 1 dia").max(365, "Máximo 365 dias").optional()
});
type BudgetFormData = z.infer<typeof budgetSchema>;
interface WormBudgetFormProps {
  budget?: any;
  // Dados iniciais para novo orçamento (não entram em modo edição)
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}
export const WormBudgetForm = ({
  budget,
  initialData,
  onSuccess,
  onCancel
}: WormBudgetFormProps) => {
  const {
    user,
    profile
  } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [pendingParts, setPendingParts] = useState<BudgetPart[]>([]);
  const isEditing = !!budget;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: {
      errors
    }
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: budget ? {
      client_id: budget.client_id || "",
      client_name: budget.client_name || "",
      client_phone: budget.client_phone || "",
      device_type: budget.device_type || "",
      device_model: budget.device_model || "",
      issue: budget.issue || "",
      part_quality: budget.part_quality || "",
      total_price: budget.total_price ? budget.total_price : 0,
      cash_price: budget.cash_price ? budget.cash_price : undefined,
      installment_price: budget.installment_price ? budget.installment_price : undefined,
      installments: budget.installments || 1,
      payment_condition: budget.payment_condition || "Cartão de Crédito",
      warranty_months: budget.warranty_months || 3,
      notes: budget.notes || "",
      includes_delivery: budget.includes_delivery || false,
      includes_screen_protector: budget.includes_screen_protector || false,
      custom_services: budget.custom_services || "",
      enable_installment_price: !!budget.installment_price,
      validity_days: 15
    } : initialData ? {
      client_id: initialData.client_id || "",
      client_name: initialData.client_name || "",
      client_phone: initialData.client_phone || "",
      device_type: initialData.device_type || "",
      device_model: initialData.device_model || "",
      issue: initialData.issue || "",
      part_quality: initialData.part_quality || "",
      total_price: initialData.total_price ? initialData.total_price : 0,
      cash_price: initialData.cash_price ? initialData.cash_price : undefined,
      installment_price: initialData.installment_price ? initialData.installment_price : undefined,
      installments: initialData.installments || 1,
      payment_condition: initialData.payment_condition || "Cartão de Crédito",
      warranty_months: initialData.warranty_months || 3,
      notes: initialData.notes || "",
      includes_delivery: initialData.includes_delivery || false,
      includes_screen_protector: initialData.includes_screen_protector || false,
      custom_services: initialData.custom_services || "",
      enable_installment_price: !!initialData.installment_price,
      validity_days: profile?.budget_warning_days ?? 15
    } : {
      total_price: 0,
      installments: 1,
      payment_condition: "Cartão de Crédito",
      warranty_months: 3,
      includes_delivery: false,
      includes_screen_protector: false,
      custom_services: "",
      enable_installment_price: false,
      validity_days: profile?.budget_warning_days ?? 15
    }
  });

  // Integrar auto-save para o formulário Worm
  const watchedData = watch();
  const { clearSavedData } = useFormAutoSave(
    watchedData,
    `worm-budget-${budget?.id || 'new'}`,
    {
      onRestore: (data) => reset(data as BudgetFormData),
      enabled: !isEditing && !initialData
    }
  );

  // Aplicar default de validade a partir de site_settings quando criando
  useEffect(() => {
    const loadDefaultValidity = async () => {
      try {
        const {
          data,
          error
        } = await supabase.from("site_settings").select("default_budget_validity_days").maybeSingle();
        if (!error && data?.default_budget_validity_days && !budget) {
          setValue("validity_days", Number(data.default_budget_validity_days));
        }
      } catch (err) {
        console.error("Erro ao buscar default de validade:", err);
      }
    };
    loadDefaultValidity();
  }, [budget, setValue]);

  // Inicializar cliente selecionado quando estiver editando
  useEffect(() => {
    const source = budget || initialData;
    if (source?.client_id) {
      setSelectedClientId(source.client_id);

      // Buscar dados completos do cliente
      const fetchClientData = async () => {
        try {
          const {
            data: clientData,
            error
          } = await supabase.from("clients").select("id, name, phone, email").eq("id", source.client_id).single();
          if (error) {
            console.error("Erro ao buscar dados do cliente:", error);
            return;
          }
          if (clientData) {
            setSelectedClient(clientData);
          }
        } catch (error) {
          console.error("Erro ao buscar cliente:", error);
        }
      };
      fetchClientData();
    } else {
      setSelectedClientId(null);
      setSelectedClient(null);
    }
  }, [budget, initialData]);

  // Utilitário: calcular dias de validade a partir de created_at e valid_until
  const calcValidityDays = (createdAt?: string, validUntil?: string) => {
    try {
      if (createdAt && validUntil) {
        const start = new Date(createdAt);
        const end = new Date(validUntil);
        const msDiff = end.getTime() - start.getTime();
        const days = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
        return Math.max(1, Math.min(365, days));
      }
    } catch (e) {
      console.warn("Falha ao calcular dias de validade, usando padrão 15");
    }
    // Fallback usa configuração global do perfil, senão 15
    return Math.max(1, Math.min(365, profile?.budget_warning_days ?? 15));
  };

  // Resetar formulário quando o budget muda
  useEffect(() => {
    if (budget) {
      const formData = {
        client_id: budget.client_id || "",
        client_name: budget.client_name || "",
        client_phone: budget.client_phone || "",
        device_type: budget.device_type || "",
        device_model: budget.device_model || "",
        issue: budget.issue || "",
        part_quality: budget.part_quality || "",
        total_price: budget.total_price ? budget.total_price : 0,
        cash_price: budget.cash_price ? budget.cash_price : undefined,
        installment_price: budget.installment_price ? budget.installment_price : undefined,
        installments: budget.installments || 1,
        payment_condition: budget.payment_condition || "Cartão de Crédito",
        warranty_months: budget.warranty_months || 3,
        notes: budget.notes || "",
        includes_delivery: budget.includes_delivery || false,
        includes_screen_protector: budget.includes_screen_protector || false,
        custom_services: budget.custom_services || "",
        enable_installment_price: !!budget.installment_price,
        validity_days: calcValidityDays(budget.created_at, budget.valid_until || budget.expires_at || undefined)
      };
      reset(formData);
    } else if (initialData) {
      const formData = {
        client_id: initialData.client_id || "",
        client_name: initialData.client_name || "",
        client_phone: initialData.client_phone || "",
        device_type: initialData.device_type || "",
        device_model: initialData.device_model || "",
        issue: initialData.issue || "",
        part_quality: initialData.part_quality || "",
        total_price: initialData.total_price ? initialData.total_price : 0,
        cash_price: initialData.cash_price ? initialData.cash_price : undefined,
        installment_price: initialData.installment_price ? initialData.installment_price : undefined,
        installments: initialData.installments || 1,
        payment_condition: initialData.payment_condition || "Cartão de Crédito",
        warranty_months: initialData.warranty_months || 3,
        notes: initialData.notes || "",
        includes_delivery: initialData.includes_delivery || false,
        includes_screen_protector: initialData.includes_screen_protector || false,
        custom_services: initialData.custom_services || "",
        enable_installment_price: !!initialData.installment_price,
        validity_days: calcValidityDays(initialData.created_at, initialData.valid_until || initialData.expires_at || undefined)
      };
      reset(formData);
    } else {
      reset({
        total_price: 0,
        installments: 1,
        payment_condition: "Cartão de Crédito",
        warranty_months: 3,
        includes_delivery: false,
        includes_screen_protector: false,
        custom_services: "",
        enable_installment_price: false,
        validity_days: profile?.budget_warning_days ?? 15
      });
    }
  }, [budget, initialData, profile, reset]);

  // Atualizar o campo quando o perfil carregar (apenas para novo orçamento)
  useEffect(() => {
    if (!isEditing && profile) {
      const days = Math.max(1, Math.min(365, profile.budget_warning_days ?? 15));
      setValue("validity_days", days);
    }
  }, [isEditing, profile?.budget_warning_days, setValue]);
  const handleClientSelect = (client: any, clientId?: string) => {
    setSelectedClient(client);
    setSelectedClientId(clientId || null);
    if (client) {
      setValue("client_id", client.id);
      setValue("client_name", client.name);
      setValue("client_phone", client.phone || "");
    } else {
      setValue("client_id", "");
      setValue("client_name", "");
      setValue("client_phone", "");
    }
  };
  const onSubmit = async (data: BudgetFormData) => {
    if (!user) return;

    // PROTEÇÃO 1: Validar cliente
    const clientName = selectedClient?.name || data.client_name?.trim();
    if (!clientName) {
      toast.error("Selecione um cliente ou preencha o nome do cliente");
      return;
    }

    // PROTEÇÃO 2: Não permitir nome "TEMPLATE"
    if (clientName.toUpperCase() === "TEMPLATE") {
      toast.error('O nome "TEMPLATE" é reservado para o sistema. Use outro nome.');
      return;
    }
    setIsLoading(true);
    try {
      // Usar valores seguros, nunca undefined
      const cashPriceValue = Number.isFinite(data.cash_price) ? data.cash_price as number : 0;
      const installmentPriceValue = Number.isFinite(data.installment_price) ? data.installment_price as number : 0;
      const totalPriceValue = Number.isFinite(data.total_price) ? data.total_price as number : 0;

      // Calcular total_price baseado nos valores fornecidos
      // Se já temos um total_price válido da seção de peças, usar ele
      const calculatedTotalPrice = totalPriceValue > 0 ? totalPriceValue : data.enable_installment_price && installmentPriceValue > 0 ? installmentPriceValue : cashPriceValue;

      // Garantir que sempre temos um preço válido (mínimo de 1 centavo)
      // O banco de dados requer total_price > 0
      const finalTotalPrice = calculatedTotalPrice > 0 ? calculatedTotalPrice : 1;

      // Avisar o usuário se o preço for muito baixo
      if (calculatedTotalPrice <= 0 && !isEditing) {
        toast.warning("Orçamento criado sem preço definido. Adicione serviços/peças para calcular o valor total.");
      }

      // Converter preços para centavos
      // Calcular data de expiração baseada em validade
      const validityDays = Number.isFinite(data.validity_days) ? data.validity_days as number : Math.max(1, Math.min(365, profile?.budget_warning_days ?? 15));
      const baseDate = isEditing && budget?.created_at ? new Date(budget.created_at) : new Date();
      baseDate.setHours(0, 0, 0, 0);
      const validUntilDate = new Date(baseDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
      const validUntilStr = validUntilDate.toISOString().split("T")[0];
      const budgetData = {
        device_type: data.device_type,
        device_model: data.device_model,
        client_id: selectedClientId || null,
        client_name: clientName,
        client_phone: (selectedClient?.phone ?? data.client_phone ?? null),
        issue: data.issue || null,
        total_price: finalTotalPrice,
        cash_price: cashPriceValue,
        installment_price: data.enable_installment_price && installmentPriceValue > 0 ? installmentPriceValue : null,
        installments: data.installments || 1,
        payment_condition: data.payment_condition || "Cartão de Crédito",
        warranty_months: data.warranty_months || 3,
        part_quality: data.part_quality || null,
        notes: data.notes || null,
        includes_delivery: data.includes_delivery || false,
        includes_screen_protector: data.includes_screen_protector || false,
        custom_services: data.custom_services || null,
        owner_id: user.id,
        workflow_status: isEditing ? budget.workflow_status || "pending" : "pending",
        valid_until: validUntilStr,
        expires_at: validUntilStr
      } as any;
      if (isEditing) {
        const {
          error
        } = await supabase.from("budgets").update(budgetData).eq("id", budget.id).eq("owner_id", user.id);
        if (error) throw error;
        toast.success("Orçamento atualizado com sucesso");
      } else {
        const {
          data: createdBudget,
          error
        } = await supabase.from("budgets").insert(budgetData).select().single();
        if (error) throw error;

        // Se houver peças pendentes adicionadas na criação, salvar em budget_parts
        if (createdBudget && pendingParts.length > 0) {
          const partsToInsert = pendingParts.slice(0, 4).map(part => {
            let priceReais = part.price || 0;
            let cashReais = part.cash_price;
            let cardReais = part.installment_price;

            // Fallback robusto se preço base for 0 ou indefinido
            if (!priceReais || priceReais === 0) {
              priceReais = cashReais || cardReais || 0;
            }

             // Se ainda não tiver cash/card definidos, usar o priceReais como base
             if (cashReais == null) cashReais = priceReais;
             if (cardReais == null) cardReais = priceReais;
             return {
               budget_id: createdBudget.id,
               name: part.part_type || part.name || "Opção",
               part_type: part.part_type ?? null,
               quantity: part.quantity || 1,
               price: Math.round(priceReais * 100),
               cash_price: cashReais != null ? Math.round(cashReais * 100) : null,
               installment_price: cardReais != null ? Math.round(cardReais * 100) : null,
               installment_count: part.installment_count ?? 0,
               warranty_months: part.warranty_months && part.warranty_months > 1 ? part.warranty_months : 3
             };
          });
          const {
            error: partsError
          } = await supabase.from("budget_parts").insert(partsToInsert);
          if (partsError) {
            console.error("Erro ao salvar serviços/peças do orçamento:", partsError);
            toast.error("Orçamento criado, mas houve erro ao salvar serviços/peças.");
          }
        }
        toast.success(getRandomAiSuccessMessage());
      }

      // Limpar rascunho após sucesso
      clearSavedData();

      // Invalidar cache do React Query para recarregar os dados
      await queryClient.invalidateQueries({
        queryKey: ["worm-budgets"]
      });
      onSuccess();
    } catch (error) {
      console.error("Error saving budget:", error);
      toast.error(isEditing ? "Erro ao atualizar orçamento" : "Erro ao criar orçamento");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    try {
      clearSavedData();
    } catch (error) {
      console.warn("Erro ao limpar rascunho no cancelamento:", error);
    }

    try {
      reset();
    } catch (error) {
      console.warn("Erro ao resetar formulário no cancelamento:", error);
    }

    onCancel();
  };

  return <div className="flex flex-col h-full bg-background/95 backdrop-blur-sm">
      <header className="shrink-0 bg-card/50 border-b border-border/40 p-4 sm:p-6 backdrop-blur-md sticky top-0 z-20 shadow-sm rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-[#fec834]">
              {isEditing ? "Editar Orçamento" : "Novo Orçamento"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditing ? "Atualize os detalhes do orçamento" : "Preencha os dados para criar um novo orçamento"}
            </p>
          </div>
          
          {isEditing && budget && <div className="flex items-center gap-2">
              <div className="bg-primary/10 px-4 py-2 rounded-full border border-primary/20 shadow-sm">
                <span className="text-sm text-primary font-sans font-medium">
                  {budget.sequential_number ? `OR: ${budget.sequential_number.toString().padStart(4, "0")}` : budget.id ? `OS-${budget.id.slice(-8)}` : "OS-NOVO"}
                </span>
              </div>
            </div>}
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full rounded-3xl">
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth form-scroll-container space-y-3 sm:space-y-4 p-4 sm:p-6 pb-4">
          {/* Cliente */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3 px-3 sm:px-6 sm:pb-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-3 sm:px-6">
              <WormClientSelector selectedClientId={selectedClientId} onClientSelect={handleClientSelect} placeholder="Selecione um cliente existente" />

              {/* Campos manuais para quando não há cliente selecionado */}
              {!selectedClientId && <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <div>
                    <Label htmlFor="client_name" className="text-xs sm:text-sm font-medium">
                      Nome do Cliente *
                    </Label>
                    <Input id="client_name" {...register("client_name")} placeholder="Nome completo do cliente" className="mt-1 h-9 sm:h-10 text-sm" />
                    {errors.client_name && <p className="text-xs text-destructive mt-1">{errors.client_name.message}</p>}
                  </div>

                  <div>
                    <Label htmlFor="client_phone" className="text-xs sm:text-sm font-medium">
                      Telefone
                    </Label>
                    <Input id="client_phone" {...register("client_phone")} placeholder="(11) 99999-9999" className="mt-1 h-9 sm:h-10 text-sm" />
                  </div>
                </div>}

              {/* Mostrar dados do cliente selecionado */}
              {selectedClientId && selectedClient && <div className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">Cliente selecionado:</div>
                      <div className="font-semibold text-sm text-foreground">{selectedClient.name}</div>
                      {selectedClient.phone && <div className="text-xs text-muted-foreground mt-1">{selectedClient.phone}</div>}
                      {selectedClient.email && <div className="text-xs text-muted-foreground">{selectedClient.email}</div>}
                    </div>
                  </div>
                </div>}
            </CardContent>
          </Card>

          {/* Informações do Dispositivo */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3 px-3 sm:px-6 sm:pb-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                </div>
                Informações do Dispositivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-3 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="device_type" className="text-xs sm:text-sm font-medium">
                    Tipo de Dispositivo *
                  </Label>
                  <Select onValueChange={value => setValue("device_type", value)} value={watch("device_type")}>
                    <SelectTrigger className="mt-1 h-9 sm:h-10 text-sm">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Smartphone">📱 Celular</SelectItem>
                      <SelectItem value="Tablet">📟 Tablet</SelectItem>
                      <SelectItem value="Notebook">💻 Notebook</SelectItem>
                      <SelectItem value="Desktop">🖥️ Desktop</SelectItem>
                      <SelectItem value="Console">🎮 Console</SelectItem>
                      <SelectItem value="Outro">📦 Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.device_type && <p className="text-xs text-destructive mt-1">{errors.device_type.message}</p>}
                </div>

                <div>
                  <Label htmlFor="device_model" className="text-xs sm:text-sm font-medium">
                    Modelo *
                  </Label>
                  <Input id="device_model" {...register("device_model")} placeholder="iPhone 14, Galaxy S23..." className="mt-1 h-9 sm:h-10 text-sm" />
                  {errors.device_model && <p className="text-xs text-destructive mt-1">{errors.device_model.message}</p>}
                </div>

                <div>
                  <Label htmlFor="part_quality" className="text-xs sm:text-sm font-medium">
                    Nome do Reparo
                  </Label>
                  <Input id="part_quality" {...register("part_quality")} placeholder="Ex: Troca de Tela, Troca de Bateria..." className="mt-1 h-9 sm:h-10 text-sm" />
                  <p className="text-xs text-muted-foreground mt-1">Qualidade / Serviço</p>
                </div>

                {/* Dias de Validade */}
                <div>
                  <Label htmlFor="validity_days" className="text-xs sm:text-sm font-medium">
                    Dias de Validade
                  </Label>
                  <Input id="validity_days" type="number" min={1} max={365} step={1} inputMode="numeric" className="mt-1 h-9 sm:h-10 text-sm" {...register("validity_days")} />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                      Defina o nº de dias para o orçamento ser "antigo"
                    </p>
                    {errors.validity_days && <p className="text-[11px] sm:text-xs text-destructive">{errors.validity_days.message}</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Serviços / Peças */}
          <BudgetPartsSection
            budgetId={isEditing ? budget?.id : undefined}
            initialLocalParts={
              isEditing
                ? pendingParts.length === 0 &&
                  budget &&
                  (budget.total_price || budget.cash_price || budget.installment_price)
                  ? [
                      {
                        id: `fallback-${budget.id || 'editar'}`,
                        ...(budget?.id ? { budget_id: budget.id } : {}),
                        name: budget.part_quality || 'Padrão',
                        part_type: budget.part_quality || 'Padrão',
                        quantity: 1,
                        // Convert cents to reais for local part fallback
                        price: (budget.total_price || budget.cash_price || budget.installment_price) / 100,
                        cash_price: budget.cash_price ? budget.cash_price / 100 : null,
                        installment_price: budget.installment_price ? budget.installment_price / 100 : null,
                        installment_count: budget.installments || 0,
                        warranty_months: budget.warranty_months || 3,
                      },
                    ]
                  : pendingParts
                : !isEditing && pendingParts.length === 0 && initialData && initialData.total_price
                  ? [
                      {
                        id: `fallback-${initialData.id || 'novo'}`,
                        name: initialData.part_quality || 'Padrão',
                        part_type: initialData.part_quality || 'Padrão',
                        quantity: 1,
                        // Convert cents to reais for local part
                        price: (initialData.total_price || initialData.cash_price || initialData.installment_price) / 100,
                        cash_price: initialData.cash_price ? initialData.cash_price / 100 : null,
                        installment_price: initialData.installment_price ? initialData.installment_price / 100 : null,
                        installment_count: initialData.installments || 0,
                        warranty_months: initialData.warranty_months || 3,
                      },
                    ]
                  : pendingParts
            }
            onTotalChange={(total, cashTotal, installmentTotal) => {
          // Garantir números sempre definidos
          const safeTotal = Number.isFinite(total) ? total : 0;
          const safeCash = Number.isFinite(cashTotal || 0) ? cashTotal as number : 0;
          const safeInstallment = Number.isFinite(installmentTotal || 0) ? installmentTotal as number : 0;
          setValue("total_price", safeTotal);
          setValue("cash_price", safeCash);
          setValue("installment_price", safeInstallment);
        }} onLocalPartsChange={parts => setPendingParts(parts)} />

          {/* Serviços Adicionais */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3 px-3 sm:px-6 sm:pb-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
                </div>
                Serviços Adicionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-3 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="includes_delivery" checked={watch("includes_delivery") ?? false} onCheckedChange={checked => setValue("includes_delivery", checked as boolean)} />
                  <Label htmlFor="includes_delivery" className="text-xs sm:text-sm cursor-pointer text-foreground">
                    🚚 Busca e entrega inclusa
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="includes_screen_protector" checked={watch("includes_screen_protector") ?? false} onCheckedChange={checked => setValue("includes_screen_protector", checked as boolean)} />
                  <Label htmlFor="includes_screen_protector" className="text-xs sm:text-sm cursor-pointer text-foreground">
                    🛡️ Película 3d de brinde
                  </Label>
                </div>
              </div>

              {/* Campo para serviços personalizados */}
              <div className="pt-2">
                <Label htmlFor="custom_services" className="text-xs sm:text-sm font-medium">
                  Outros Serviços Personalizados
                </Label>
                <Textarea id="custom_services" {...register("custom_services")} placeholder="Ex: Limpeza interna, troca de capa traseira, backup de dados..." rows={3} maxLength={30} className="mt-1 text-sm resize-none" />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Liste outros serviços incluídos neste orçamento
                  </p>
                  <div className={`text-[11px] sm:text-xs ${(watch("custom_services")?.length || 0) > 24 ? "text-orange-500" : (watch("custom_services")?.length || 0) > 27 ? "text-red-500" : "text-muted-foreground"}`}>
                    {watch("custom_services")?.length || 0}/30 caracteres
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3 px-3 sm:px-6 sm:pb-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
                </div>
                Observações
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div>
                <Label htmlFor="notes" className="text-xs sm:text-sm font-medium">
                  Observações Gerais
                </Label>
                <Textarea id="notes" {...register("notes")} placeholder="Informações adicionais sobre o orçamento" rows={2} maxLength={70} className="mt-1 text-sm resize-none" />
                <div className="flex justify-between items-center mt-1">
                  <div>{errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}</div>
                  <div className={`text-xs ${(watch("notes")?.length || 0) > 60 ? "text-orange-500" : (watch("notes")?.length || 0) > 70 ? "text-red-500" : "text-muted-foreground"}`}>
                    {watch("notes")?.length || 0}/70 caracteres
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer fixo com design melhorado */}
        <div className="shrink-0 bg-card/80 backdrop-blur-md border-t border-border/40 p-4 sm:p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] sticky bottom-0 z-20 rounded-3xl">
          <div className="max-w-2xl mx-auto w-full">
            <div className="flex flex-col-reverse xs:flex-row gap-3 sm:gap-4">
              <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 h-12 text-base font-medium border-2 hover:bg-muted/50 transition-all duration-300 active:scale-[0.98] rounded-xl text-foreground">
                <X className="h-5 w-5 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-[2] h-12 text-base font-medium bg-[#fec832] hover:bg-[#e6b42b] text-black shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl">
                {isLoading ? <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Salvando...</span>
                  </div> : <div className="flex items-center gap-2 text-black">
                    <CheckCircle className="h-5 w-5" />
                    <span>{isEditing ? "Atualizar Orçamento" : "Criar Orçamento"}</span>
                  </div>}
              </Button>
            </div>
          </div>
        </div>

        <ScrollIndicator containerRef={scrollContainerRef} className="sm:hidden" />
      </form>
    </div>;
};
