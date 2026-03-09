// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useResponsive } from "@/hooks/useResponsive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Smartphone, FileText, Hash, Calendar as CalendarIcon, User, Phone, Wallet, Calculator, UserCog, Save, CheckSquare, Info, ChevronDown, Check, AlertCircle } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/useToast";
import { useFormAutoSave } from "@/hooks/useAutoSave";
import { DevicePasswordSection } from "@/components/service-orders/DevicePasswordSection";
import { DeviceChecklist, DeviceChecklistData } from "@/components/service-orders/DeviceChecklist";
import { DevicePasswordData } from "@/hooks/useServiceOrderEdit";
type Technician = {
  id: string;
  name: string;
  default_commission_rate: number;
};
const RepairsServices = () => {
  const {
    showSuccess,
    showError
  } = useToast();
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = !!id;
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // Form States
  const [deviceName, setDeviceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [imeiSerial, setImeiSerial] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceOrderNumber, setServiceOrderNumber] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [chargedAmount, setChargedAmount] = useState("");
  const [serviceDate, setServiceDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [technicianId, setTechnicianId] = useState<string>("");
  const [applyCommission, setApplyCommission] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  // Complex States
  const [devicePassword, setDevicePassword] = useState<DevicePasswordData>({
    type: "",
    value: "",
    metadata: undefined
  });
  const [deviceChecklist, setDeviceChecklist] = useState<DeviceChecklistData | undefined>(undefined);
  const [clientPhoneError, setClientPhoneError] = useState<string>("");
  const [imeiError, setImeiError] = useState<string>("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const { isMobile } = useResponsive();

  type MobileStep = 0 | 1 | 2 | 3 | 4 | 5;
  const [mobileStep, setMobileStep] = useState<MobileStep>(0);
  const [wantsAdvancedDetails, setWantsAdvancedDetails] = useState<boolean | null>(null);

  // Integrar auto-save para o formulário de reparos
  const formData = {
    deviceName,
    serviceDescription,
    imeiSerial,
    clientName,
    clientPhone,
    serviceOrderNumber,
    costAmount,
    chargedAmount,
    serviceDate,
    technicianId,
    applyCommission,
    devicePassword,
    deviceChecklist
  };

  const { clearSavedData } = useFormAutoSave(
    formData,
    `repair-service-${id || 'new'}`,
    {
      onRestore: (data: any) => {
        if (data.deviceName) setDeviceName(data.deviceName);
        if (data.serviceDescription) setServiceDescription(data.serviceDescription);
        if (data.imeiSerial) setImeiSerial(data.imeiSerial);
        if (data.clientName) setClientName(data.clientName);
        if (data.clientPhone) setClientPhone(data.clientPhone);
        if (data.serviceOrderNumber) setServiceOrderNumber(data.serviceOrderNumber);
        if (data.costAmount) setCostAmount(data.costAmount);
        if (data.chargedAmount) setChargedAmount(data.chargedAmount);
        if (data.serviceDate) setServiceDate(data.serviceDate);
        if (data.technicianId) setTechnicianId(data.technicianId);
        if (data.applyCommission !== undefined) setApplyCommission(data.applyCommission);
        if (data.devicePassword) setDevicePassword(data.devicePassword);
        if (data.deviceChecklist) setDeviceChecklist(data.deviceChecklist);

        // Se tiver dados complementares restaurados, abre a aba
        if (data.clientName || data.clientPhone || data.serviceOrderNumber || data.devicePassword?.value || data.deviceChecklist) {
          setIsAdvancedOpen(true);
        }
      },
      enabled: !isEditing, // Apenas para novos lançamentos
      disableBeforeUnloadOnMobile: true
    }
  );

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 10) {
      const part1 = digits.slice(0, 2);
      const part2 = digits.slice(2, 6);
      const part3 = digits.slice(6, 10);
      return [part1 ? `(${part1}` : "", part1 && part1.length === 2 ? ") " : "", part2, part3 ? `-${part3}` : ""].join("");
    } else {
      const part1 = digits.slice(0, 2);
      const part2 = digits.slice(2, 7);
      const part3 = digits.slice(7, 11);
      return [part1 ? `(${part1}` : "", part1 && part1.length === 2 ? ") " : "", part2, part3 ? `-${part3}` : ""].join("");
    }
  };
  const handlePhoneChange = (value: string) => {
    const masked = formatPhone(value);
    setClientPhone(masked);
    const digits = masked.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) {
      setClientPhoneError("Telefone deve ter 10 ou 11 dígitos com DDD");
    } else {
      setClientPhoneError("");
    }
  };
  const handleImeiChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 15);
    setImeiSerial(digits);
    if (digits && digits.length !== 15) {
      setImeiError("IMEI deve ter exatamente 15 dígitos");
    } else {
      setImeiError("");
    }
  };
  const [hasOverdueClosings, setHasOverdueClosings] = useState<boolean>(false);
  useEffect(() => {
    const checkOverdue = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const {
        data
      } = await supabase.from("repair_services").select("id").eq("user_id", user.id).is("archived_at", null).lt("created_at", startOfCurrentMonth).limit(1);
      setHasOverdueClosings(!!data && data.length > 0);
    };
    checkOverdue();
  }, []);
  useEffect(() => {
    let isMounted = true;
    const loadTechnicians = async () => {
      try {
        const {
          data: {
            user
          },
          error: authError
        } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user || !isMounted) return;
        const {
          data,
          error
        } = await supabase.from<any>("repair_technicians").select("id, name, default_commission_rate").eq("user_id", user.id).eq("is_active", true).order("name");
        if (error) throw error;
        if (isMounted) {
          setTechnicians((data || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            default_commission_rate: Number(t.default_commission_rate || 0)
          })));
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Error loading technicians:", err);
        const isNetworkError = err.message === "Failed to fetch" || err.message?.includes("network") || err.name === "TypeError";
        showError({
          title: isNetworkError ? "Erro de Conexão" : "Erro ao carregar técnicos",
          description: isNetworkError ? "Não foi possível conectar ao servidor. Verifique sua internet ou as configurações do projeto." : err.message
        });
      }
    };
    loadTechnicians();
    return () => {
      isMounted = false;
    };
  }, [showError]);
  useEffect(() => {
    if (!id) return;
    const loadService = async () => {
      try {
        const {
          data,
          error
        } = await supabase.from("repair_services").select("*").eq("id", id).single();
        if (error) throw error;
        if (data) {
          setDeviceName(data.device_name);
          setServiceDescription(data.service_description);
          setImeiSerial(data.imei_serial || "");
          setClientName(data.client_name || "");
          if (data.client_phone) {
            setClientPhone(formatPhone(data.client_phone));
          }
          setServiceOrderNumber(data.service_order_number || "");
          setServiceDate(data.created_at ? data.created_at.split("T")[0] : new Date().toISOString().split("T")[0]);
          setCostAmount(data.cost_amount?.toString() || "");
          setChargedAmount(data.charged_amount?.toString() || "");
          setTechnicianId(data.technician_id || "");
          setApplyCommission(data.has_commission ?? true);
          if (data.device_password_type || data.device_password_value) {
            setDevicePassword({
              type: data.device_password_type || "",
              value: data.device_password_value || "",
              metadata: data.device_password_metadata || undefined
            });
          }
          if (data.device_checklist) {
            setDeviceChecklist(data.device_checklist);
          }

          // Se tiver dados complementares, abre a aba
          if (data.client_name || data.client_phone || data.service_order_number || data.device_password_value || data.device_checklist) {
            setIsAdvancedOpen(true);
          }
        }
      } catch (err: any) {
        showError({
          title: "Erro ao carregar serviço",
          description: err.message
        });
        navigate("/reparos");
      }
    };
    loadService();
  }, [id]);
  const selectedRate = useMemo(() => {
    const tech = technicians.find(t => t.id === technicianId);
    return tech ? tech.default_commission_rate : 0;
  }, [technicians, technicianId]);
  const numbers = useMemo(() => {
    const cost = Number(costAmount) || 0;
    const charged = Number(chargedAmount) || 0;
    const baseProfit = charged - cost;
    const commission = applyCommission && technicianId ? +(Math.max(0, baseProfit) * (selectedRate / 100)).toFixed(2) : 0;
    const net = +(baseProfit - commission).toFixed(2);
    return {
      cost,
      charged,
      commission,
      net,
      baseProfit
    };
  }, [costAmount, chargedAmount, applyCommission, technicianId, selectedRate]);
  const canSave = useMemo(() => {
    const imeiIsValid = !imeiSerial || imeiSerial.replace(/\D/g, "").length === 15;
    return deviceName.trim().length > 1 && serviceDescription.trim().length > 1 && Number(chargedAmount) >= 0 && Number(costAmount) >= 0 && !!serviceDate && imeiIsValid;
  }, [deviceName, serviceDescription, chargedAmount, costAmount, serviceDate, imeiSerial]);

  const canProceedDevice = useMemo(() => {
    // Mantém o critério simples: aparelho + descrição preenchidos e IMEI (se houver) válido.
    const imeiIsValid = !imeiSerial || imeiSerial.replace(/\D/g, "").length === 15;
    return deviceName.trim().length > 1 && serviceDescription.trim().length > 1 && !!serviceDate && imeiIsValid;
  }, [deviceName, serviceDescription, serviceDate, imeiSerial]);

  const canProceedValues = useMemo(() => {
    return Number(chargedAmount) >= 0 && Number(costAmount) >= 0;
  }, [chargedAmount, costAmount]);

  const mobileSteps = useMemo(() => {
    return [
      { id: 0, label: "Dispositivo" },
      { id: 1, label: "Valores" },
      { id: 2, label: "Técnico" },
      { id: 3, label: "Detalhes" },
      { id: 4, label: "Complementares" },
      { id: 5, label: "Resumo" }
    ] as const;
  }, []);

  const selectMobileStep = (step: MobileStep) => {
    // Regras especiais para manter consistência do fluxo da pergunta "Detalhes?"
    if (step === 4) {
      setWantsAdvancedDetails(true);
      setMobileStep(4);
      return;
    }

    if (step === 5) {
      setWantsAdvancedDetails(false);
      setMobileStep(5);
      return;
    }

    if (step === 3) {
      setMobileStep(3);
      return;
    }

    setMobileStep(step);
  };

  const stepStatus = useMemo(() => {
    return {
      0: canProceedDevice ? "ok" : "pending",
      1: canProceedValues ? "ok" : "pending",
      2: technicianId ? "ok" : "optional",
      3: wantsAdvancedDetails === null ? "pending" : "ok",
      4: "optional",
      5: canSave ? "ok" : "pending"
    } as const;
  }, [canProceedDevice, canProceedValues, technicianId, wantsAdvancedDetails, canSave]);

  const mobileStepNotice = useMemo(() => {
    if (!isMobile) return null;
    if (mobileStep === 0) return null;

    // Avisos leves (não bloqueiam navegação; só orientam). O bloqueio final segue em canSave.
    if (!canProceedDevice) {
      return "Preencha Dispositivo, Descrição e Data (e IMEI válido, se informar) para conseguir salvar.";
    }
    if (mobileStep >= 2 && !canProceedValues) {
      return "Informe Valores (Cobrado e Custo) para conseguir salvar.";
    }
    if (mobileStep === 5 && !canSave) {
      return "Ainda faltam dados obrigatórios. Complete as etapas pendentes para habilitar o botão Salvar.";
    }

    return null;
  }, [isMobile, mobileStep, canProceedDevice, canProceedValues, canSave]);
  const onSave = async () => {
    setSaving(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Garante que salvamos sempre a mesma data selecionada, independente de fuso horário
      const createdAtIso = serviceDate ? new Date(`${serviceDate}T12:00:00.000Z`).toISOString() : new Date().toISOString();
      const payload = {
        user_id: user.id,
        created_at: createdAtIso,
        device_name: deviceName.trim(),
        service_description: serviceDescription.trim(),
        imei_serial: imeiSerial.trim() || null,
        client_name: clientName.trim() || null,
        client_phone: clientPhone.replace(/\D/g, "") || null,
        service_order_number: serviceOrderNumber.trim() || null,
        device_password_type: devicePassword.type || null,
        device_password_value: devicePassword.value || null,
        device_password_metadata: devicePassword.metadata ?? null,
        device_checklist: deviceChecklist ?? null,
        cost_amount: numbers.cost,
        charged_amount: numbers.charged,
        technician_id: technicianId || null,
        has_commission: applyCommission && !!technicianId,
        commission_amount: numbers.commission,
        net_profit: numbers.net
      };
      if (id) {
        // Modo edição: atualiza o serviço existente em vez de criar um novo
        const {
          error
        } = await supabase.from<any>("repair_services").update(payload).eq("id", id);
        if (error) throw error;
        showSuccess({
          title: "Serviço atualizado com sucesso!"
        });
      } else {
        // Modo criação: insere um novo registro
        const {
          error
        } = await supabase.from<any>("repair_services").insert([payload]);
        if (error) throw error;
        showSuccess({
          title: "Serviço lançado com sucesso!"
        });

        // Limpar rascunho após sucesso
        clearSavedData();

        // Voltar para a Etapa 1 após criar
        setMobileStep(0);
        setWantsAdvancedDetails(null);
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

        // Reset form apenas ao criar um novo serviço
        setDeviceName("");
        setServiceDescription("");
        setImeiSerial("");
        setClientName("");
        setClientPhone("");
        setServiceOrderNumber("");
        setCostAmount("");
        setChargedAmount("");
        setServiceDate(new Date().toISOString().split("T")[0]);
        setTechnicianId("");
        setApplyCommission(true);
        setDevicePassword({
          type: "",
          value: "",
          metadata: undefined
        });
        setDeviceChecklist(undefined);
      }
    } catch (err: any) {
      showError({
        title: "Erro ao salvar serviço",
        description: err.message
      });
    } finally {
      setSaving(false);
    }
  };
  const SummaryInlineBar = () => {
    return (
      <button
        type="button"
        onClick={() => selectMobileStep(5)}
        className={
          "mt-3 w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-left " +
          "cursor-pointer transition-colors hover:bg-muted/40 " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        }
        aria-label="Ir para o resumo do pedido (etapa 6)"
      >
        <div className="grid grid-cols-3 gap-3 text-[11px]">
          <div className="min-w-0">
            <div className="text-muted-foreground">Cobrado</div>
            <div className="font-medium text-foreground truncate">
              R$ {(Number(chargedAmount) || 0).toFixed(2)}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-muted-foreground">Custo</div>
            <div className="font-medium text-foreground truncate">
              R$ {(Number(costAmount) || 0).toFixed(2)}
            </div>
          </div>

          <div className="min-w-0 text-right">
            <div className="text-muted-foreground">Líquido</div>
            <div
              className={
                "font-medium truncate " +
                (numbers.net >= 0 ? "text-primary" : "text-destructive")
              }
            >
              R$ {numbers.net.toFixed(2)}
            </div>
          </div>
        </div>
      </button>
    );
  };

  const SummaryCard = () => {
    return (
      <Card className="card-premium border-primary/10 shadow-lg">
        <CardHeader className="pb-3 bg-primary/5 border-b border-primary/10">
          <CardTitle className="text-base flex items-center gap-2 text-primary">
            <Calculator className="h-4 w-4" />
            Resumo do Pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Lucro Bruto (Cobrado - Custo)</span>
            <span className="font-medium">R$ {numbers.baseProfit.toFixed(2)}</span>
          </div>

          {technicianId && applyCommission && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1">Comissão Técnico ({selectedRate}%)</span>
              <span className="font-medium">- R$ {numbers.commission.toFixed(2)}</span>
            </div>
          )}

          <div className="my-2 border-t border-dashed border-border" />

          <div className="flex items-center justify-between">
            <span className="font-semibold text-lg">Lucro Líquido</span>
            <span className={`font-bold text-xl ${numbers.net >= 0 ? "text-primary" : "text-destructive"}`}>
              R$ {numbers.net.toFixed(2)}
            </span>
          </div>

          <Button
            size="lg"
            className="w-full mt-4 h-12 text-base font-semibold shadow-md transition-all hover:scale-[1.02]"
            onClick={onSave}
            disabled={!canSave || saving}
          >
            {saving ? (
              "Salvando..."
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                {isEditing ? "Salvar alterações" : "Lançar serviço"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return <div className="space-y-4 pb-8">
    {/* Header / Modo de edição */}
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button type="button" onClick={() => navigate("/reparos")} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm hover:border-primary/40 hover:text-primary transition-colors">

          Voltar
        </button>
        <span className="hidden text-border lg:inline">/</span>

      </div>

      <div className="flex items-center gap-2">
        {isEditing ? <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/60 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-300/60 dark:bg-amber-400/10 dark:text-amber-200">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          Você está alterando um serviço existente
        </div> : <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Lançamento de serviço
        </div>}
      </div>
    </div>

    {isMobile ? (
      <div className="space-y-6">
        {/* Card principal (por etapas) */}
        <Card className="card-premium">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              {isEditing ? "Editar serviço de reparo" : "Novo serviço de reparo"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Etapa {mobileStep + 1} de 6
            </p>

            {/* Stepper clicável (mobile) */}
            <TooltipProvider>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {mobileSteps.map(step => {
                  const status = stepStatus[step.id];
                  const isActive = mobileStep === step.id;
                  const Icon = status === "ok" ? Check : status === "pending" ? AlertCircle : null;
                  const iconClass = status === "ok" ? "text-primary" : status === "pending" ? "text-destructive" : "text-muted-foreground";

                  return (
                    <Tooltip key={step.id}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant={isActive ? "default" : "outline"}
                          onClick={() => selectMobileStep(step.id as MobileStep)}
                          className="shrink-0 h-9 px-3"
                        >
                          <span className="text-xs">{step.label}</span>
                          {Icon ? <Icon className={`h-3.5 w-3.5 ${iconClass}`} /> : null}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {status === "ok" ? "Ok" : status === "pending" ? "Pendente" : "Opcional"}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>

            {/* Barra fina de resumo (mobile): não aparece no passo final */}
            {mobileStep !== 5 ? <SummaryInlineBar /> : null}
          </CardHeader>

          <CardContent className="grid gap-5 pt-4">
            {mobileStepNotice ? (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <Info className="h-4 w-4 mt-0.5 text-primary" />
                <p className="text-muted-foreground text-xs leading-relaxed">{mobileStepNotice}</p>
              </div>
            ) : null}
            {/* Etapa 1: Informações do dispositivo */}
            {mobileStep === 0 && (
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                    Informações do dispositivo
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="device" className="flex items-center gap-2 text-sm font-medium">
                        Dispositivo <span className="text-destructive">*</span>
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">Informe o modelo do aparelho.</p>
                    <Input id="device" value={deviceName} onChange={e => setDeviceName(e.target.value)} placeholder="Ex: iPhone 11, Samsung S20..." className="h-10" />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Descrição do serviço
                    </Label>
                    <p className="text-xs text-muted-foreground">Descreva o serviço realizado.</p>
                    <Input id="description" value={serviceDescription} onChange={e => setServiceDescription(e.target.value)} placeholder="Ex: Troca de tela, Bateria..." className="h-10" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="imei" className="text-sm font-medium">
                      IMEI / Número de série
                    </Label>
                    <p className="text-xs text-muted-foreground">Informe o IMEI ou número de série, quando disponível.</p>
                    <Input id="imei" inputMode="numeric" value={imeiSerial} onChange={e => handleImeiChange(e.target.value)} placeholder="Ex: 3599..." className="h-10 font-mono text-sm" />
                    {imeiError && <p className="text-xs text-destructive">{imeiError}</p>}
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="date" className="flex items-center gap-2 text-sm font-medium">
                      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      Data do Serviço
                    </Label>
                    <p className="text-xs text-muted-foreground">Selecione a data de lançamento do serviço.</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-full justify-start gap-2 text-left font-normal"
                          aria-label="Abrir calendário para selecionar a data do serviço"
                        >
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span className={serviceDate ? "text-foreground" : "text-muted-foreground"}>
                            {serviceDate
                              ? format(new Date(`${serviceDate}T12:00:00.000Z`), "dd/MM/yyyy", { locale: ptBR })
                              : "Selecionar data"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-popover border border-border shadow-xl z-[100]" align="start" sideOffset={8}>
                        <Calendar
                          mode="single"
                          selected={serviceDate ? new Date(`${serviceDate}T12:00:00.000Z`) : undefined}
                          onSelect={(d: Date | undefined) => {
                            if (!d) return;
                            setServiceDate(format(d, "yyyy-MM-dd"));
                          }}
                          locale={ptBR as any}
                          initialFocus
                          className="bg-popover"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            )}

            {/* Etapa 2: Valores do serviço */}
            {mobileStep === 1 && (
              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                  Valores do serviço
                </p>

                <div className="grid gap-4 bg-muted/40 rounded-lg p-3 border border-border/40">
                  <div className="grid gap-1.5">
                    <Label htmlFor="cost" className="text-sm font-medium">Custo das peças</Label>
                    <p className="text-xs text-muted-foreground">Informe o custo total das peças e insumos utilizados.</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                      <Input id="cost" inputMode="decimal" value={costAmount} onChange={e => setCostAmount(e.target.value)} placeholder="0,00" className="pl-9 h-11 text-base" />
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="charged" className="text-sm font-medium">Valor cobrado ao cliente</Label>
                    <p className="text-xs text-muted-foreground">Informe o valor cobrado ao cliente pelo serviço.</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary text-sm font-semibold">R$</span>
                      <Input id="charged" inputMode="decimal" value={chargedAmount} onChange={e => setChargedAmount(e.target.value)} placeholder="0,00" className="pl-9 h-11 text-base border-primary/20 focus:border-primary font-medium" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Etapa 3: Responsável */}
            {mobileStep === 2 && (
              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                  Responsável pelo serviço
                </p>

                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                      Técnico Responsável
                    </Label>
                    <p className="text-xs text-muted-foreground">Selecione o técnico que executou o serviço.</p>
                    <Select value={technicianId} onValueChange={setTechnicianId}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Selecione o técnico" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            <span className="font-medium">{t.name}</span>
                            <span className="text-muted-foreground ml-2">({t.default_commission_rate}%)</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Aplicar Comissão</Label>
                      <p className="text-xs text-muted-foreground">Se habilitado, calcula comissão sobre o lucro bruto.</p>
                    </div>
                    <Switch checked={applyCommission} onCheckedChange={setApplyCommission} />
                  </div>
                </div>
              </div>
            )}

            {/* Etapa 4: pergunta de detalhes */}
            {mobileStep === 3 && (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                    Detalhes do reparo
                  </p>
                  <h2 className="text-base font-semibold mt-1">Deseja adicionar detalhes do reparo?</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se sim, você poderá preencher dados do cliente, senhas e checklist do aparelho.
                  </p>
                </div>

                <div className="grid gap-3">
                  <Button
                    type="button"
                    variant={wantsAdvancedDetails === true ? "default" : "outline"}
                    className="h-12"
                    onClick={() => {
                      setWantsAdvancedDetails(true);
                      setMobileStep(4);
                    }}
                  >
                    Sim, adicionar detalhes
                  </Button>
                  <Button
                    type="button"
                    variant={wantsAdvancedDetails === false ? "default" : "outline"}
                    className="h-12"
                    onClick={() => {
                      setWantsAdvancedDetails(false);
                      setMobileStep(5);
                    }}
                  >
                    Não, ir para o resumo
                  </Button>
                </div>
              </div>
            )}

            {/* Etapa 5: Informações Complementares */}
            {mobileStep === 4 && (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                    Informações Complementares
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Cliente, Senhas e Checklist do Aparelho</p>
                </div>

                <Card className="card-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Dados do Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="clientName" className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        Nome do Cliente
                      </Label>
                      <p className="text-xs text-muted-foreground">Informe o nome completo do cliente.</p>
                      <Input id="clientName" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: João Silva" className="h-10" />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="clientPhone" className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        Telefone / WhatsApp
                      </Label>
                      <p className="text-xs text-muted-foreground">Use apenas números com DDD.</p>
                      <Input id="clientPhone" inputMode="numeric" value={clientPhone} onChange={e => handlePhoneChange(e.target.value)} placeholder="(00) 00000-0000" className="h-10" />
                      {clientPhoneError && <p className="text-xs text-destructive">{clientPhoneError}</p>}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="osNumber" className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        Nº Ordem de Serviço / Protocolo
                      </Label>
                      <p className="text-xs text-muted-foreground">Opcional. Utilize o padrão interno.</p>
                      <Input id="osNumber" value={serviceOrderNumber} onChange={e => setServiceOrderNumber(e.target.value)} placeholder="Ex: OS-1234" className="h-10" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      Estado do Dispositivo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <DevicePasswordSection value={devicePassword} onChange={setDevicePassword} disabled={saving} />
                    <div className="border-t border-border/50 pt-6">
                      <DeviceChecklist value={deviceChecklist} onChange={setDeviceChecklist} disabled={saving} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Etapa 6: Resumo */}
            {mobileStep === 5 && (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                    Final
                  </p>
                  <h2 className="text-base font-semibold mt-1">Resumo do Pedido</h2>
                  <p className="text-xs text-muted-foreground mt-1">Revise antes de salvar.</p>
                </div>

                <SummaryCard />
              </div>
            )}

            {/* Ações */}
            <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (mobileStep === 0) {
                    navigate("/reparos");
                    return;
                  }

                  // Voltar respeitando o fluxo (detalhes)
                  if (mobileStep === 5 && wantsAdvancedDetails === false) {
                    setMobileStep(3);
                    return;
                  }
                  if (mobileStep === 5 && wantsAdvancedDetails === true) {
                    setMobileStep(4);
                    return;
                  }
                  if (mobileStep === 4) {
                    setMobileStep(3);
                    return;
                  }
                  setMobileStep((mobileStep - 1) as MobileStep);
                }}
              >
                Voltar
              </Button>

              <Button
                type="button"
                onClick={() => {
                  if (mobileStep === 0) {
                    if (!canProceedDevice) return;
                    setMobileStep(1);
                    return;
                  }
                  if (mobileStep === 1) {
                    if (!canProceedValues) return;
                    setMobileStep(2);
                    return;
                  }
                  if (mobileStep === 2) {
                    setMobileStep(3);
                    return;
                  }
                  if (mobileStep === 4) {
                    setMobileStep(5);
                    return;
                  }
                }}
                disabled={(mobileStep === 0 && !canProceedDevice) || (mobileStep === 1 && !canProceedValues) || mobileStep === 3 || mobileStep === 5}
              >
                {mobileStep === 5 ? "Pronto" : "Avançar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    ) : (
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column - Service & Device Info */}
        <div className="space-y-6 lg:col-span-7">
          {hasOverdueClosings && <Alert className="bg-destructive/5 border-destructive/40 text-destructive-foreground">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção: Fechamentos Pendentes</AlertTitle>
            <AlertDescription>
              Existem meses anteriores em aberto. É altamente recomendado realizar o fechamento mensal no Dashboard
              antes de lançar novos serviços.
            </AlertDescription>
          </Alert>}

          {/* Service Details Card */}
          <Card className="card-premium">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                {isEditing ? "Editar serviço de reparo" : "Novo serviço de reparo"}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {isEditing ? "Revise e atualize as informações deste serviço já registrado. Todas as alterações serão salvas neste mesmo registro." : "Preencha os dados principais do serviço para ter relatórios e comissões mais precisos."}
              </p>
            </CardHeader>
            <CardContent className="grid gap-5 pt-4">
              {/* Bloco: Informações do dispositivo */}
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                    Informações do dispositivo
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="device" className="flex items-center gap-2 text-sm font-medium">
                        Dispositivo <span className="text-destructive">*</span>
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isEditing ? "Atualize o modelo do aparelho, se necessário." : "Informe o modelo do aparelho."}
                    </p>
                    <Input id="device" value={deviceName} onChange={e => setDeviceName(e.target.value)} placeholder="Ex: iPhone 11, Samsung S20..." className="h-10" />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Descrição do serviço
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isEditing ? "Revise a descrição do serviço realizado." : "Descreva o serviço realizado."}
                    </p>
                    <Input id="description" value={serviceDescription} onChange={e => setServiceDescription(e.target.value)} placeholder="Ex: Troca de tela, Bateria..." className="h-10" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="imei" className="text-sm font-medium">
                      IMEI / Número de série
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Informe o IMEI ou número de série, quando disponível.
                    </p>
                    <Input id="imei" inputMode="numeric" value={imeiSerial} onChange={e => handleImeiChange(e.target.value)} placeholder="Ex: 3599..." className="h-10 font-mono text-sm" />
                    {imeiError && <p className="text-xs text-destructive">{imeiError}</p>}
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="date" className="flex items-center gap-2 text-sm font-medium">
                      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      Data do Serviço
                    </Label>
                    <p className="text-xs text-muted-foreground">Selecione a data de lançamento do serviço.</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-full justify-start gap-2 text-left font-normal"
                          aria-label="Abrir calendário para selecionar a data do serviço"
                        >
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span className={serviceDate ? "text-foreground" : "text-muted-foreground"}>
                            {serviceDate
                              ? format(new Date(`${serviceDate}T12:00:00.000Z`), "dd/MM/yyyy", { locale: ptBR })
                              : "Selecionar data"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-popover border border-border shadow-xl z-[100]" align="start" sideOffset={8}>
                        <Calendar
                          mode="single"
                          selected={serviceDate ? new Date(`${serviceDate}T12:00:00.000Z`) : undefined}
                          onSelect={(d: Date | undefined) => {
                            if (!d) return;
                            setServiceDate(format(d, "yyyy-MM-dd"));
                          }}
                          locale={ptBR as any}
                          initialFocus
                          className="bg-popover"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Bloco: Valores do serviço */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                    Valores do serviço
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/40 rounded-lg p-3 border border-border/40">
                  <div className="grid gap-1.5">
                    <Label htmlFor="cost" className="text-sm font-medium">
                      Custo das peças
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Informe o custo total das peças e insumos utilizados.
                    </p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                      <Input id="cost" inputMode="decimal" value={costAmount} onChange={e => setCostAmount(e.target.value)} placeholder="0,00" className="pl-9 h-11 text-base" />
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="charged" className="text-sm font-medium">
                      Valor cobrado ao cliente
                    </Label>
                    <p className="text-xs text-muted-foreground">Informe o valor cobrado ao cliente pelo serviço.</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary text-sm font-semibold">
                        R$
                      </span>
                      <Input id="charged" inputMode="decimal" value={chargedAmount} onChange={e => setChargedAmount(e.target.value)} placeholder="0,00" className="pl-9 h-11 text-base border-primary/20 focus:border-primary font-medium" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloco: Técnico responsável */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                    Responsável pelo serviço
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                      Técnico Responsável
                    </Label>
                    <p className="text-xs text-muted-foreground">Selecione o técnico que executou o serviço.</p>
                    <Select value={technicianId} onValueChange={setTechnicianId}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Selecione o técnico" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.map(t => <SelectItem key={t.id} value={t.id}>
                          <span className="font-medium">{t.name}</span>
                          <span className="text-muted-foreground ml-2">({t.default_commission_rate}%)</span>
                        </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Aplicar Comissão</Label>
                      <p className="text-xs text-muted-foreground">
                        Se habilitado, calcula comissão sobre o lucro bruto.
                      </p>
                    </div>
                    <Switch checked={applyCommission} onCheckedChange={setApplyCommission} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-2 border-t border-border/40 pt-2">
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="w-full h-auto p-4 flex items-center justify-between bg-card hover:bg-accent/50 hover:border-primary/50 border-dashed border-2 hover:border-solid transition-all duration-300 group rounded-xl shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <UserCog className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {isAdvancedOpen ? "Ocultar Informações Complementares" : "Adicionar Informações Complementares"}
                      </span>
                      <span className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">
                        Cliente, Senhas e Checklist do Aparelho
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform duration-300 ${isAdvancedOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-6 animate-in slide-in-from-top-2 fade-in duration-300">
                {/* Client Details Card */}
                <Card className="card-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Dados do Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="clientName" className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        Nome do Cliente
                      </Label>
                      <p className="text-xs text-muted-foreground">Informe o nome completo do cliente.</p>
                      <Input id="clientName" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: João Silva" className="h-10" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="clientPhone" className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        Telefone / WhatsApp
                      </Label>
                      <p className="text-xs text-muted-foreground">Use apenas números com DDD.</p>
                      <Input id="clientPhone" inputMode="numeric" value={clientPhone} onChange={e => handlePhoneChange(e.target.value)} placeholder="(00) 00000-0000" className="h-10" />
                      {clientPhoneError && <p className="text-xs text-destructive">{clientPhoneError}</p>}
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="osNumber" className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        Nº Ordem de Serviço / Protocolo
                      </Label>
                      <p className="text-xs text-muted-foreground">Opcional. Utilize o padrão interno.</p>
                      <Input id="osNumber" value={serviceOrderNumber} onChange={e => setServiceOrderNumber(e.target.value)} placeholder="Ex: OS-1234" className="h-10" />
                    </div>
                  </CardContent>
                </Card>

                {/* Device Status & Checklist */}
                <Card className="card-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      Estado do Dispositivo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <DevicePasswordSection value={devicePassword} onChange={setDevicePassword} disabled={saving} />

                    <div className="border-t border-border/50 pt-6">
                      <DeviceChecklist value={deviceChecklist} onChange={setDeviceChecklist} disabled={saving} />
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Right Column - Financials & Summary */}
        <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-24">
          {/* Summary Sticky Card */}
          <SummaryCard />
        </div>
      </div>
    )}
  </div>;
};
export default RepairsServices;