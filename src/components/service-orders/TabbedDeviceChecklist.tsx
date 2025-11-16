/**
 * Componente de Checklist de Funcionamento do Aparelho com Abas
 * Para uso na página de compartilhamento público - mostra apenas itens funcionando organizados em abas
 * Sistema OneDrip - Design discreto e compacto com navegação por abas
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, CheckSquare } from 'lucide-react';
import { DeviceChecklistData } from './DeviceChecklist';

interface TabbedDeviceChecklistProps {
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

// Títulos e emojis das seções
const sectionTitles: Record<string, { title: string; emoji: string }> = {
  tela_toque: { title: 'Tela e Toque', emoji: '🖥️' },
  botoes_fisicos: { title: 'Botões Físicos', emoji: '🔘' },
  seguranca_sensores: { title: 'Segurança e Sensores', emoji: '🔐' },
  som_comunicacao: { title: 'Som e Comunicação', emoji: '🔊' },
  cameras: { title: 'Câmeras', emoji: '📸' },
  conectividade_energia: { title: 'Conectividade e Energia', emoji: '⚙️' },
};

export const TabbedDeviceChecklist: React.FC<TabbedDeviceChecklistProps> = ({ data }) => {
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

  // Filtrar apenas seções que têm itens funcionando
  const sectionsWithItems = Object.keys(groupedItems).filter(sectionKey => 
    groupedItems[sectionKey].length > 0
  );

  // Se não há seções com itens, não exibir o componente
  if (sectionsWithItems.length === 0) {
    return null;
  }

  // Primeira seção como padrão
  const defaultTab = sectionsWithItems[0];

  return (
    <Card className="border-border/30 bg-muted/20 mb-8">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckSquare className="h-4 w-4 text-green-600" />
          <span className="text-muted-foreground">Funcionalidades Testadas</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Itens verificados e funcionando corretamente
        </p>
      </CardHeader>
      <CardContent className="pb-6">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1 h-auto p-1 mb-4">
            {sectionsWithItems.map((sectionKey) => {
              const sectionInfo = sectionTitles[sectionKey];
              if (!sectionInfo) return null;

              return (
                <TabsTrigger
                  key={sectionKey}
                  value={sectionKey}
                  className="flex flex-col items-center gap-1 p-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-[60px] transition-all duration-200"
                >
                  <span className="text-base">{sectionInfo.emoji}</span>
                  <span className="text-center leading-tight text-[10px] sm:text-xs">{sectionInfo.title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {sectionsWithItems.map((sectionKey) => {
            const items = groupedItems[sectionKey];
            if (!items || items.length === 0) return null;

            return (
              <TabsContent key={sectionKey} value={sectionKey} className="mt-6 mb-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((item) => (
                      <div
                        key={`${item.section}-${item.item}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/20 hover:bg-muted/40 transition-colors duration-200"
                      >
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-foreground leading-relaxed">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TabbedDeviceChecklist;