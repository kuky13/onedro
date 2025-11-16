/**
 * Componente de Checklist de Funcionamento do Aparelho
 * Para uso em ordens de serviço - permite ao técnico marcar o que está funcionando
 * Sistema OneDrip - Mobile First Design
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, CheckSquare, CheckCircle, XCircle } from 'lucide-react';

export interface DeviceChecklistData {
  tela_toque: {
    tela_display_quebrado: boolean;
    touch_screen_funciona: boolean;
    tampa_traseira_quebrada: boolean;
  };
  botoes_fisicos: {
    botao_volume_mais: boolean;
    botao_volume_menos: boolean;
    botao_power: boolean;
    botao_3_personalizado: boolean;
    botao_4_personalizado: boolean;
  };
  seguranca_sensores: {
    face_id: boolean;
    biometria: boolean;
    sensor_proximidade: boolean;
    flash: boolean;
  };
  som_comunicacao: {
    alto_falante_principal: boolean;
    alto_falante_auricular: boolean;
    microfone_1: boolean;
    microfone_2: boolean;
    fones_ouvido: boolean;
    ligacao_audio: boolean;
  };
  cameras: {
    camera_frontal: boolean;
    camera_traseira_1: boolean;
    camera_traseira_2: boolean;
    camera_traseira_3: boolean;
    camera_traseira_4: boolean;
  };
  conectividade_energia: {
    wifi: boolean;
    bluetooth: boolean;
    carregamento_cabo: boolean;
    carregamento_wireless: boolean;
    cartao_microsd: boolean;
  };
}

const initialChecklistData: DeviceChecklistData = {
  tela_toque: {
    tela_display_quebrado: false,
    touch_screen_funciona: false,
    tampa_traseira_quebrada: false,
  },
  botoes_fisicos: {
    botao_volume_mais: false,
    botao_volume_menos: false,
    botao_power: false,
    botao_3_personalizado: false,
    botao_4_personalizado: false,
  },
  seguranca_sensores: {
    face_id: false,
    biometria: false,
    sensor_proximidade: false,
    flash: false,
  },
  som_comunicacao: {
    alto_falante_principal: false,
    alto_falante_auricular: false,
    microfone_1: false,
    microfone_2: false,
    fones_ouvido: false,
    ligacao_audio: false,
  },
  cameras: {
    camera_frontal: false,
    camera_traseira_1: false,
    camera_traseira_2: false,
    camera_traseira_3: false,
    camera_traseira_4: false,
  },
  conectividade_energia: {
    wifi: false,
    bluetooth: false,
    carregamento_cabo: false,
    carregamento_wireless: false,
    cartao_microsd: false,
  },
};

interface DeviceChecklistProps {
  value?: DeviceChecklistData;
  onChange: (data: DeviceChecklistData) => void;
  disabled?: boolean;
}

interface ChecklistSectionProps {
  title: string;
  emoji: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const ChecklistSection: React.FC<ChecklistSectionProps> = ({
  title,
  emoji,
  isOpen,
  onToggle,
  children
}) => (
  <Collapsible open={isOpen} onOpenChange={onToggle}>
    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <span className="font-medium text-foreground">{title}</span>
      </div>
      {isOpen ? (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </CollapsibleTrigger>
    <CollapsibleContent className="mt-2">
      <div className="space-y-3 p-3 bg-background/50 rounded-lg border border-border/30">
        {children}
      </div>
    </CollapsibleContent>
  </Collapsible>
);

interface ChecklistItemProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  id,
  label,
  checked,
  onChange,
  disabled = false
}) => (
  <div className="flex items-center space-x-3">
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
    />
    <Label
      htmlFor={id}
      className={`text-sm cursor-pointer ${
        checked ? 'text-foreground font-medium' : 'text-muted-foreground'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {label}
    </Label>
  </div>
);

export const DeviceChecklist: React.FC<DeviceChecklistProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  // Garantir que value nunca seja null/undefined
  const checklistData = value || initialChecklistData;
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    tela_toque: true,
    botoes_fisicos: false,
    seguranca_sensores: false,
    som_comunicacao: false,
    cameras: false,
    conectividade_energia: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateChecklistItem = (
    section: keyof DeviceChecklistData,
    item: string,
    checked: boolean
  ) => {
    const updatedData = {
      ...checklistData,
      [section]: {
        ...checklistData[section],
        [item]: checked
      }
    };
    onChange(updatedData);
  };

  // Função para marcar todos os itens como true
  const markAllItems = (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const allMarkedData: DeviceChecklistData = {
      tela_toque: {
        tela_display_quebrado: true,
        touch_screen_funciona: true,
        tampa_traseira_quebrada: true,
      },
      botoes_fisicos: {
        botao_volume_mais: true,
        botao_volume_menos: true,
        botao_power: true,
        botao_3_personalizado: true,
        botao_4_personalizado: true,
      },
      seguranca_sensores: {
        face_id: true,
        biometria: true,
        sensor_proximidade: true,
        flash: true,
      },
      som_comunicacao: {
        alto_falante_principal: true,
        alto_falante_auricular: true,
        microfone_1: true,
        microfone_2: true,
        fones_ouvido: true,
        ligacao_audio: true,
      },
      cameras: {
        camera_frontal: true,
        camera_traseira_1: true,
        camera_traseira_2: true,
        camera_traseira_3: true,
        camera_traseira_4: true,
      },
      conectividade_energia: {
        wifi: true,
        bluetooth: true,
        carregamento_cabo: true,
        carregamento_wireless: true,
        cartao_microsd: true,
      },
    };
    onChange(allMarkedData);
  };

  // Função para desmarcar todos os itens
  const unmarkAllItems = (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    onChange(initialChecklistData);
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              📋 Checklist de Funcionamento do Aparelho
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Marque os itens que estão funcionando corretamente no aparelho
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={markAllItems}
              disabled={disabled}
              className="flex items-center gap-1 text-xs sm:text-sm"
            >
              <CheckCircle className="h-4 w-4" />
              <span className="hidden xs:inline">Marcar Tudo</span>
              <span className="xs:hidden">✓ Tudo</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={unmarkAllItems}
              disabled={disabled}
              className="flex items-center gap-1 text-xs sm:text-sm"
            >
              <XCircle className="h-4 w-4" />
              <span className="hidden xs:inline">Desmarcar Tudo</span>
              <span className="xs:hidden">✗ Tudo</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tela e Toque */}
        <ChecklistSection
          title="Tela e Toque"
          emoji="🖥️"
          isOpen={openSections.tela_toque}
          onToggle={() => toggleSection('tela_toque')}
        >
          <ChecklistItem
            id="tela_display_quebrado"
            label="Tela / Display quebrado"
            checked={checklistData.tela_toque.tela_display_quebrado}
            onChange={(checked) => updateChecklistItem('tela_toque', 'tela_display_quebrado', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="touch_screen_funciona"
            label="Touch screen funciona corretamente"
            checked={checklistData.tela_toque.touch_screen_funciona}
            onChange={(checked) => updateChecklistItem('tela_toque', 'touch_screen_funciona', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="tampa_traseira_quebrada"
            label="Tampa traseira quebrada"
            checked={checklistData.tela_toque.tampa_traseira_quebrada}
            onChange={(checked) => updateChecklistItem('tela_toque', 'tampa_traseira_quebrada', checked)}
            disabled={disabled}
          />
        </ChecklistSection>

        {/* Botões Físicos */}
        <ChecklistSection
          title="Botões Físicos"
          emoji="🔘"
          isOpen={openSections.botoes_fisicos}
          onToggle={() => toggleSection('botoes_fisicos')}
        >
          <ChecklistItem
            id="botao_volume_mais"
            label="Botão de volume +"
            checked={checklistData.botoes_fisicos.botao_volume_mais}
            onChange={(checked) => updateChecklistItem('botoes_fisicos', 'botao_volume_mais', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="botao_volume_menos"
            label="Botão de volume −"
            checked={checklistData.botoes_fisicos.botao_volume_menos}
            onChange={(checked) => updateChecklistItem('botoes_fisicos', 'botao_volume_menos', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="botao_power"
            label="Botão Power (liga/desliga)"
            checked={checklistData.botoes_fisicos.botao_power}
            onChange={(checked) => updateChecklistItem('botoes_fisicos', 'botao_power', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="botao_3_personalizado"
            label="Botão 3 (personalizado / lateral)"
            checked={checklistData.botoes_fisicos.botao_3_personalizado}
            onChange={(checked) => updateChecklistItem('botoes_fisicos', 'botao_3_personalizado', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="botao_4_personalizado"
            label="Botão 4 (personalizado / lateral)"
            checked={checklistData.botoes_fisicos.botao_4_personalizado}
            onChange={(checked) => updateChecklistItem('botoes_fisicos', 'botao_4_personalizado', checked)}
            disabled={disabled}
          />
        </ChecklistSection>

        {/* Segurança e Sensores */}
        <ChecklistSection
          title="Segurança e Sensores"
          emoji="🔐"
          isOpen={openSections.seguranca_sensores}
          onToggle={() => toggleSection('seguranca_sensores')}
        >
          <ChecklistItem
            id="face_id"
            label="Face ID (reconhecimento facial)"
            checked={checklistData.seguranca_sensores.face_id}
            onChange={(checked) => updateChecklistItem('seguranca_sensores', 'face_id', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="biometria"
            label="Biometria (leitor de digital)"
            checked={checklistData.seguranca_sensores.biometria}
            onChange={(checked) => updateChecklistItem('seguranca_sensores', 'biometria', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="sensor_proximidade"
            label="Sensor de proximidade"
            checked={checklistData.seguranca_sensores.sensor_proximidade}
            onChange={(checked) => updateChecklistItem('seguranca_sensores', 'sensor_proximidade', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="flash"
            label="Flash funcionando"
            checked={checklistData.seguranca_sensores.flash}
            onChange={(checked) => updateChecklistItem('seguranca_sensores', 'flash', checked)}
            disabled={disabled}
          />
        </ChecklistSection>

        {/* Som e Comunicação */}
        <ChecklistSection
          title="Som e Comunicação"
          emoji="🔊"
          isOpen={openSections.som_comunicacao}
          onToggle={() => toggleSection('som_comunicacao')}
        >
          <ChecklistItem
            id="alto_falante_principal"
            label="Alto-falante principal"
            checked={checklistData.som_comunicacao.alto_falante_principal}
            onChange={(checked) => updateChecklistItem('som_comunicacao', 'alto_falante_principal', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="alto_falante_auricular"
            label="Alto-falante auricular (chamada)"
            checked={checklistData.som_comunicacao.alto_falante_auricular}
            onChange={(checked) => updateChecklistItem('som_comunicacao', 'alto_falante_auricular', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="microfone_1"
            label="Microfone 1 (principal)"
            checked={checklistData.som_comunicacao.microfone_1}
            onChange={(checked) => updateChecklistItem('som_comunicacao', 'microfone_1', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="microfone_2"
            label="Microfone 2 (viva-voz)"
            checked={checklistData.som_comunicacao.microfone_2}
            onChange={(checked) => updateChecklistItem('som_comunicacao', 'microfone_2', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="fones_ouvido"
            label="Fones de ouvido (entrada P2 ou Bluetooth)"
            checked={checklistData.som_comunicacao.fones_ouvido}
            onChange={(checked) => updateChecklistItem('som_comunicacao', 'fones_ouvido', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="ligacao_audio"
            label="Ligação (áudio e conexão)"
            checked={checklistData.som_comunicacao.ligacao_audio}
            onChange={(checked) => updateChecklistItem('som_comunicacao', 'ligacao_audio', checked)}
            disabled={disabled}
          />
        </ChecklistSection>

        {/* Câmeras */}
        <ChecklistSection
          title="Câmeras"
          emoji="📸"
          isOpen={openSections.cameras}
          onToggle={() => toggleSection('cameras')}
        >
          <ChecklistItem
            id="camera_frontal"
            label="Câmera frontal"
            checked={checklistData.cameras.camera_frontal}
            onChange={(checked) => updateChecklistItem('cameras', 'camera_frontal', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="camera_traseira_1"
            label="Câmera traseira 1"
            checked={checklistData.cameras.camera_traseira_1}
            onChange={(checked) => updateChecklistItem('cameras', 'camera_traseira_1', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="camera_traseira_2"
            label="Câmera traseira 2"
            checked={checklistData.cameras.camera_traseira_2}
            onChange={(checked) => updateChecklistItem('cameras', 'camera_traseira_2', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="camera_traseira_3"
            label="Câmera traseira 3"
            checked={checklistData.cameras.camera_traseira_3}
            onChange={(checked) => updateChecklistItem('cameras', 'camera_traseira_3', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="camera_traseira_4"
            label="Câmera traseira 4"
            checked={checklistData.cameras.camera_traseira_4}
            onChange={(checked) => updateChecklistItem('cameras', 'camera_traseira_4', checked)}
            disabled={disabled}
          />
        </ChecklistSection>

        {/* Conectividade e Energia */}
        <ChecklistSection
          title="Conectividade e Energia"
          emoji="⚙️"
          isOpen={openSections.conectividade_energia}
          onToggle={() => toggleSection('conectividade_energia')}
        >
          <ChecklistItem
            id="wifi"
            label="Wi-Fi funcionando"
            checked={checklistData.conectividade_energia.wifi}
            onChange={(checked) => updateChecklistItem('conectividade_energia', 'wifi', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="bluetooth"
            label="Bluetooth funcionando"
            checked={checklistData.conectividade_energia.bluetooth}
            onChange={(checked) => updateChecklistItem('conectividade_energia', 'bluetooth', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="carregamento_cabo"
            label="Carregamento via cabo"
            checked={checklistData.conectividade_energia.carregamento_cabo}
            onChange={(checked) => updateChecklistItem('conectividade_energia', 'carregamento_cabo', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="carregamento_wireless"
            label="Carregamento por indução (wireless)"
            checked={checklistData.conectividade_energia.carregamento_wireless}
            onChange={(checked) => updateChecklistItem('conectividade_energia', 'carregamento_wireless', checked)}
            disabled={disabled}
          />
          <ChecklistItem
            id="cartao_microsd"
            label="Cartão microSD reconhecido"
            checked={checklistData.conectividade_energia.cartao_microsd}
            onChange={(checked) => updateChecklistItem('conectividade_energia', 'cartao_microsd', checked)}
            disabled={disabled}
          />
        </ChecklistSection>
      </CardContent>
    </Card>
  );
};
