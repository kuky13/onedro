/**
 * Componente Simplificado de Checklist de Funcionamento do Aparelho
 * Para uso na página de compartilhamento público - mostra apenas itens funcionando
 * Sistema OneDrip - Design discreto e compacto
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, CheckSquare } from 'lucide-react';
import { DeviceChecklistData } from './DeviceChecklist';

interface SimpleDeviceChecklistProps {
  data?: DeviceChecklistData | null;
}

// Mapeamento de labels para exibição
const itemLabels: Record<string, Record<string, string>> = {
  tela_toque: {
    tela_display_quebrado: 'Tela / Display quebrado',
    touch_screen_funciona: 'Touch screen funciona corretamente',
    tampa_traseira_quebrada: 'Tampa traseira quebrada',
  },
  botoes_fisicos: {
    botao_volume_mais: 'Botão de volume +',
    botao_volume_menos: 'Botão de volume −',
    botao_power: 'Botão Power (liga/desliga)',
    botao_3_personalizado: 'Botão 3 (personalizado / lateral)',
    botao_4_personalizado: 'Botão 4 (personalizado / lateral)',
  },
  seguranca_sensores: {
    face_id: 'Face ID (reconhecimento facial)',
    biometria: 'Biometria (leitor de digital)',
    sensor_proximidade: 'Sensor de proximidade',
    flash: 'Flash funcionando',
  },
  som_comunicacao: {
    alto_falante_principal: 'Alto-falante principal',
    alto_falante_auricular: 'Alto-falante auricular (chamada)',
    microfone_1: 'Microfone 1 (principal)',
    microfone_2: 'Microfone 2 (viva-voz)',
    fones_ouvido: 'Fones de ouvido (entrada P2 ou Bluetooth)',
    ligacao_audio: 'Ligação (áudio e conexão)',
  },
  cameras: {
    camera_frontal: 'Câmera frontal',
    camera_traseira_1: 'Câmera traseira 1',
    camera_traseira_2: 'Câmera traseira 2',
    camera_traseira_3: 'Câmera traseira 3',
    camera_traseira_4: 'Câmera traseira 4',
  },
  conectividade_energia: {
    wifi: 'Wi-Fi funcionando',
    bluetooth: 'Bluetooth funcionando',
    carregamento_cabo: 'Carregamento via cabo',
    carregamento_wireless: 'Carregamento por indução (wireless)',
    cartao_microsd: 'Cartão microSD reconhecido',
  },
};

// Mapeamento de seções para exibição
const sectionTitles: Record<string, { title: string; emoji: string }> = {
  tela_toque: { title: 'Tela e Toque', emoji: '🖥️' },
  botoes_fisicos: { title: 'Botões Físicos', emoji: '🔘' },
  seguranca_sensores: { title: 'Segurança e Sensores', emoji: '🔐' },
  som_comunicacao: { title: 'Som e Comunicação', emoji: '🔊' },
  cameras: { title: 'Câmeras', emoji: '📸' },
  conectividade_energia: { title: 'Conectividade e Energia', emoji: '⚙️' },
};

export const SimpleDeviceChecklist: React.FC<SimpleDeviceChecklistProps> = ({ data }) => {
  if (!data) {
    return null;
  }

  // Coletar todos os itens que estão marcados como true
  const workingItems: Array<{ section: string; item: string; label: string }> = [];

  Object.entries(data).forEach(([sectionKey, sectionData]) => {
    if (sectionData && typeof sectionData === 'object') {
      Object.entries(sectionData).forEach(([itemKey, itemValue]) => {
        if (itemValue === true) {
          const label = itemLabels[sectionKey]?.[itemKey] || itemKey;
          workingItems.push({
            section: sectionKey,
            item: itemKey,
            label,
          });
        }
      });
    }
  });

  // Se não há itens funcionando, não exibir o componente
  if (workingItems.length === 0) {
    return null;
  }

  // Agrupar itens por seção
  const groupedItems = workingItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, typeof workingItems>);

  return (
    <Card className="border-border/30 bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckSquare className="h-4 w-4 text-green-600" />
          <span className="text-muted-foreground">Funcionalidades Testadas</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Itens verificados e funcionando corretamente
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedItems).map(([sectionKey, items]) => {
          const sectionInfo = sectionTitles[sectionKey];
          if (!sectionInfo) return null;

          return (
            <div key={sectionKey} className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <span className="text-base">{sectionInfo.emoji}</span>
                {sectionInfo.title}
              </h4>
              <div className="grid grid-cols-1 gap-1.5 pl-6">
                {items.map((item) => (
                  <div
                    key={`${item.section}-${item.item}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};