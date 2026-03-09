/**
 * Componente de Checklist de Funcionamento do Aparelho
 * Sincronizado com os testes de Diagnóstico Automático
 * Sistema OneDrip - Mobile First Design
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Smartphone, Zap } from 'lucide-react';
import { ChecklistTestRunner } from './ChecklistTestRunner';
import { DiagnosticShareDialog } from './DiagnosticShareDialog';

// Nova estrutura sincronizada com TESTS_CONFIG
export interface DeviceChecklistData {
  // Tela (display_touch, display_colors)
  tela: {
    touch_screen: boolean; // display_touch ⚡
    multi_touch: boolean; // display_touch ⚡
    cores_pixels: boolean; // display_colors ⚡
    display_integro: boolean; // manual
    sem_manchas: boolean; // display_colors ⚡
    brilho: boolean; // display_colors ⚡
    rotacao_tela: boolean; // sensors (orientation) ⚡
  };
  // Áudio (audio_speaker, audio_mic)
  audio: {
    alto_falante: boolean; // audio_speaker ⚡
    microfone: boolean; // audio_mic ⚡
    alto_falante_auricular: boolean; // manual
    entrada_fone: boolean; // manual
    gravacao_audio: boolean; // audio_mic ⚡
  };
  // Câmeras (camera_front, camera_back)
  cameras: {
    camera_frontal: boolean; // camera_front ⚡
    camera_traseira: boolean; // camera_back ⚡
    flash: boolean; // camera_back ⚡
    foco_automatico: boolean; // manual
    gravacao_video: boolean; // camera ⚡
  };
  // Sensores (vibration, buttons, sensors)
  sensores: {
    vibracao: boolean; // vibration ⚡
    botao_volume_mais: boolean; // buttons ⚡
    botao_volume_menos: boolean; // buttons ⚡
    botao_power: boolean; // buttons ⚡
    acelerometro: boolean; // sensors ⚡
    giroscopio: boolean; // sensors ⚡
    proximidade: boolean; // sensors ⚡
    bussola: boolean; // sensors (orientation) ⚡
    luz_ambiente: boolean; // sensors ⚡
    gps: boolean; // location ⚡
  };
  // Sistema (battery)
  sistema: {
    bateria: boolean; // battery ⚡
    carregamento: boolean; // battery (charging) ⚡
    wifi: boolean; // connectivity ⚡
    bluetooth: boolean; // manual
    armazenamento: boolean; // storage API ⚡
  };
  // Extras manuais (não testáveis automaticamente)
  extras: {
    face_id: boolean;
    biometria: boolean;
    nfc: boolean;
    chip_sim: boolean;
    tampa_traseira_ok: boolean;
  };
}

const initialChecklistData: DeviceChecklistData = {
  tela: {
    touch_screen: false,
    multi_touch: false,
    cores_pixels: false,
    display_integro: false,
    sem_manchas: false,
    brilho: false,
    rotacao_tela: false
  },
  audio: {
    alto_falante: false,
    microfone: false,
    alto_falante_auricular: false,
    entrada_fone: false,
    gravacao_audio: false
  },
  cameras: {
    camera_frontal: false,
    camera_traseira: false,
    flash: false,
    foco_automatico: false,
    gravacao_video: false
  },
  sensores: {
    vibracao: false,
    botao_volume_mais: false,
    botao_volume_menos: false,
    botao_power: false,
    acelerometro: false,
    giroscopio: false,
    proximidade: false,
    bussola: false,
    luz_ambiente: false,
    gps: false
  },
  sistema: {
    bateria: false,
    carregamento: false,
    wifi: false,
    bluetooth: false,
    armazenamento: false
  },
  extras: {
    face_id: false,
    biometria: false,
    nfc: false,
    chip_sim: false,
    tampa_traseira_ok: false
  }
};

// Função para migrar dados do formato antigo para o novo
function migrateOldChecklistData(oldData: any): DeviceChecklistData {
  // Se já está no novo formato, retornar com defaults para campos novos
  if (oldData?.tela !== undefined) {
    return {
      tela: {
        touch_screen: oldData.tela?.touch_screen ?? false,
        multi_touch: oldData.tela?.multi_touch ?? false,
        cores_pixels: oldData.tela?.cores_pixels ?? false,
        display_integro: oldData.tela?.display_integro ?? false,
        sem_manchas: oldData.tela?.sem_manchas ?? false,
        brilho: oldData.tela?.brilho ?? false,
        rotacao_tela: oldData.tela?.rotacao_tela ?? false
      },
      audio: {
        alto_falante: oldData.audio?.alto_falante ?? false,
        microfone: oldData.audio?.microfone ?? false,
        alto_falante_auricular: oldData.audio?.alto_falante_auricular ?? false,
        entrada_fone: oldData.audio?.entrada_fone ?? false,
        gravacao_audio: oldData.audio?.gravacao_audio ?? false
      },
      cameras: {
        camera_frontal: oldData.cameras?.camera_frontal ?? false,
        camera_traseira: oldData.cameras?.camera_traseira ?? false,
        flash: oldData.cameras?.flash ?? false,
        foco_automatico: oldData.cameras?.foco_automatico ?? false,
        gravacao_video: oldData.cameras?.gravacao_video ?? false
      },
      sensores: {
        vibracao: oldData.sensores?.vibracao ?? false,
        botao_volume_mais: oldData.sensores?.botao_volume_mais ?? false,
        botao_volume_menos: oldData.sensores?.botao_volume_menos ?? false,
        botao_power: oldData.sensores?.botao_power ?? false,
        acelerometro: oldData.sensores?.acelerometro ?? false,
        giroscopio: oldData.sensores?.giroscopio ?? false,
        proximidade: oldData.sensores?.proximidade ?? false,
        bussola: oldData.sensores?.bussola ?? false,
        luz_ambiente: oldData.sensores?.luz_ambiente ?? false,
        gps: oldData.sensores?.gps ?? false
      },
      sistema: {
        bateria: oldData.sistema?.bateria ?? false,
        carregamento: oldData.sistema?.carregamento ?? false,
        wifi: oldData.sistema?.wifi ?? false,
        bluetooth: oldData.sistema?.bluetooth ?? false,
        armazenamento: oldData.sistema?.armazenamento ?? false
      },
      extras: {
        face_id: oldData.extras?.face_id ?? false,
        biometria: oldData.extras?.biometria ?? false,
        nfc: oldData.extras?.nfc ?? false,
        chip_sim: oldData.extras?.chip_sim ?? false,
        tampa_traseira_ok: oldData.extras?.tampa_traseira_ok ?? false
      }
    };
  }

  // Migrar do formato antigo (tela_toque, botoes_fisicos, etc.)
  return {
    tela: {
      touch_screen: oldData?.tela_toque?.touch_screen_funciona ?? false,
      multi_touch: false,
      cores_pixels: false,
      display_integro: !(oldData?.tela_toque?.tela_display_quebrado ?? false),
      sem_manchas: false,
      brilho: false,
      rotacao_tela: false
    },
    audio: {
      alto_falante: oldData?.som_comunicacao?.alto_falante_principal ?? false,
      microfone: oldData?.som_comunicacao?.microfone_1 ?? false,
      alto_falante_auricular: oldData?.som_comunicacao?.alto_falante_auricular ?? false,
      entrada_fone: oldData?.som_comunicacao?.fones_ouvido ?? false,
      gravacao_audio: false
    },
    cameras: {
      camera_frontal: oldData?.cameras?.camera_frontal ?? false,
      camera_traseira: oldData?.cameras?.camera_traseira_1 ?? false,
      flash: oldData?.seguranca_sensores?.flash ?? false,
      foco_automatico: false,
      gravacao_video: false
    },
    sensores: {
      vibracao: false,
      botao_volume_mais: oldData?.botoes_fisicos?.botao_volume_mais ?? false,
      botao_volume_menos: oldData?.botoes_fisicos?.botao_volume_menos ?? false,
      botao_power: oldData?.botoes_fisicos?.botao_power ?? false,
      acelerometro: false,
      giroscopio: false,
      proximidade: oldData?.seguranca_sensores?.sensor_proximidade ?? false,
      bussola: false,
      luz_ambiente: false,
      gps: false
    },
    sistema: {
      bateria: false,
      carregamento: oldData?.conectividade_energia?.carregamento_cabo ?? false,
      wifi: oldData?.conectividade_energia?.wifi ?? false,
      bluetooth: oldData?.conectividade_energia?.bluetooth ?? false,
      armazenamento: false
    },
    extras: {
      face_id: oldData?.seguranca_sensores?.face_id ?? false,
      biometria: oldData?.seguranca_sensores?.biometria ?? false,
      nfc: false,
      chip_sim: false,
      tampa_traseira_ok: !(oldData?.tela_toque?.tampa_traseira_quebrada ?? false)
    }
  };
}

// Mapeamento de quais itens são testáveis automaticamente
const autoTestableItems: {[key: string]: string[];} = {
  tela: ['touch_screen', 'multi_touch', 'cores_pixels', 'sem_manchas', 'brilho', 'rotacao_tela'],
  audio: ['alto_falante', 'microfone', 'gravacao_audio'],
  cameras: ['camera_frontal', 'camera_traseira', 'flash', 'gravacao_video'],
  sensores: ['vibracao', 'botao_volume_mais', 'botao_volume_menos', 'botao_power', 'acelerometro', 'giroscopio', 'proximidade', 'bussola', 'luz_ambiente', 'gps'],
  sistema: ['bateria', 'carregamento', 'wifi', 'armazenamento'],
  extras: [] as string[]
};

interface DeviceChecklistProps {
  value?: DeviceChecklistData | null;
  onChange: (data: DeviceChecklistData) => void;
  disabled?: boolean;
  serviceOrderId?: string;
}

interface ChecklistSectionProps {
  title: string;
  emoji: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  autoTestCount?: number;
  totalAutoTestable?: number;
}

const ChecklistSection: React.FC<ChecklistSectionProps> = ({
  title,
  emoji,
  isOpen,
  onToggle,
  children,
  autoTestCount = 0,
  totalAutoTestable = 0
}) =>
<Collapsible open={isOpen} onOpenChange={onToggle}>
    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <span className="font-medium text-foreground">{title}</span>
        {totalAutoTestable > 0 &&
      <Badge variant={autoTestCount === totalAutoTestable ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
            <Zap className="h-2.5 w-2.5 mr-0.5" />
            {autoTestCount}/{totalAutoTestable}
          </Badge>
      }
      </div>
      {isOpen ?
    <ChevronDown className="h-4 w-4 text-muted-foreground" /> :

    <ChevronRight className="h-4 w-4 text-muted-foreground" />
    }
    </CollapsibleTrigger>
    <CollapsibleContent className="mt-2">
      <div className="space-y-2 p-3 bg-background/50 rounded-lg border border-border/30">
        {children}
      </div>
    </CollapsibleContent>
  </Collapsible>;


interface ChecklistItemProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  isAutoTestable?: boolean;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  id,
  label,
  checked,
  onChange,
  disabled = false,
  isAutoTestable = false
}) =>
<div
  className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${checked ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
  
    <Checkbox
    id={id}
    checked={checked}
    onCheckedChange={onChange}
    disabled={disabled}
    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
  
    <Label
    htmlFor={id}
    className={`flex-1 text-sm cursor-pointer select-none flex items-center gap-2 ${checked ? 'text-primary font-medium' : 'text-foreground'}`}>
    
      {label}
      {isAutoTestable &&
    <Zap className="h-3 w-3 text-amber-500" />
    }
    </Label>
  </div>;


export const DeviceChecklist: React.FC<DeviceChecklistProps> = ({
  value,
  onChange,
  disabled = false,
  serviceOrderId
}) => {
  // Migrar dados antigos para o novo formato se necessário
  const checklistData = value ? migrateOldChecklistData(value) : initialChecklistData;

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    tela: true,
    audio: false,
    cameras: false,
    sensores: false,
    sistema: false,
    extras: false
  });

  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleTestComplete = (testResults: DeviceChecklistData) => {
    onChange(testResults);
    setIsTestRunnerOpen(false);
  };

  const updateChecklistItem = (
  section: keyof DeviceChecklistData,
  item: string,
  checked: boolean) =>
  {
    const updatedData: DeviceChecklistData = {
      ...checklistData,
      [section]: {
        ...checklistData[section],
        [item]: checked
      }
    };
    onChange(updatedData);
  };

  const markAllItems = (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const allMarked: DeviceChecklistData = {
      tela: { touch_screen: true, multi_touch: true, cores_pixels: true, display_integro: true, sem_manchas: true, brilho: true, rotacao_tela: true },
      audio: { alto_falante: true, microfone: true, alto_falante_auricular: true, entrada_fone: true, gravacao_audio: true },
      cameras: { camera_frontal: true, camera_traseira: true, flash: true, foco_automatico: true, gravacao_video: true },
      sensores: { vibracao: true, botao_volume_mais: true, botao_volume_menos: true, botao_power: true, acelerometro: true, giroscopio: true, proximidade: true, bussola: true, luz_ambiente: true, gps: true },
      sistema: { bateria: true, carregamento: true, wifi: true, bluetooth: true, armazenamento: true },
      extras: { face_id: true, biometria: true, nfc: true, chip_sim: true, tampa_traseira_ok: true }
    };
    onChange(allMarked);
  };

  const unmarkAllItems = (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    onChange(initialChecklistData);
  };

  // Contar itens auto-testáveis marcados por seção
  const countAutoTestable = (section: keyof DeviceChecklistData) => {
    const items = autoTestableItems[section];
    if (!items) return 0;
    const sectionData = checklistData[section] as Record<string, boolean>;
    return items.filter((item) => sectionData[item]).length;
  };

  const getAutoTestableLength = (section: string): number => {
    return autoTestableItems[section]?.length ?? 0;
  };

  const isAutoTestable = (section: string, item: string): boolean => {
    const items = autoTestableItems[section];
    if (!items) return false;
    return items.includes(item);
  };

  return (
    <div className="space-y-4">
      {/* Botão de Diagnóstico */}
      <Card className="border-border/50 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Diagnóstico Automático</h3>
                <p className="text-sm text-muted-foreground">
                  Testa Touch, Cores, Áudio, Câmeras, Sensores e mais
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="default"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsShareDialogOpen(true);
              }}
              disabled={disabled}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90">
              
              <Zap className="h-4 w-4" />
              Iniciar Diagnóstico
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DiagnosticShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        onOpenDirect={() => {
          setIsShareDialogOpen(false);
          setIsTestRunnerOpen(true);
        }}
        serviceOrderId={serviceOrderId}
        onChecklistUpdate={onChange} />
      

      {/* Card do Checklist */}
      



































































































































































































































































































































































































      

      {/* Test Runner Modal */}
      <ChecklistTestRunner
        isOpen={isTestRunnerOpen}
        onClose={() => setIsTestRunnerOpen(false)}
        onComplete={handleTestComplete}
        currentChecklist={value} />
      
    </div>);

};