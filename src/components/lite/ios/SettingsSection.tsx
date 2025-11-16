import React from 'react';
import { Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

interface SettingsSectionProps {
  formData: {
    includes_delivery: boolean;
    includes_screen_protector: boolean;
    observations: string;
    validity_days?: number;
    expires_at: string;
  };
  onInputChange: (field: string, value: string | number | boolean) => void;
}

// Função para converter ISO string para DD/MM/AAAA
const formatDateToDisplay = (isoString: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Função para converter DD/MM/AAAA para ISO string
const formatDateToISO = (displayDate: string): string => {
  if (!displayDate) return '';
  
  const parts = displayDate.split('/');
  if (parts.length !== 3) return '';
  
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const year = parseInt(parts[2]);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return '';
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return '';
  
  const date = new Date(year, month - 1, day);
  return date.toISOString().split('T')[0];
};

// Função para aplicar máscara DD/MM/AAAA
const applyDateMask = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Aplica a máscara
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 4) {
    return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  } else {
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  }
};

export const SettingsSection = ({
  formData,
  onInputChange
}: SettingsSectionProps) => {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = applyDateMask(e.target.value);
    
    // Se a data está completa (DD/MM/AAAA), converte para ISO
    if (maskedValue.length === 10) {
      const isoDate = formatDateToISO(maskedValue);
      if (isoDate) {
        onInputChange('expires_at', isoDate);
        return;
      }
    }
    
    // Caso contrário, mantém o valor formatado para exibição
    onInputChange('expires_at', maskedValue);
  };
  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
          <Settings className="h-5 w-5 text-primary" />
          Configurações Adicionais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includes_delivery"
            checked={formData.includes_delivery}
            onCheckedChange={(checked) => onInputChange('includes_delivery', checked === true)}
          />
          <Label 
            htmlFor="includes_delivery" 
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            Inclui entrega
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="includes_screen_protector"
            checked={formData.includes_screen_protector}
            onCheckedChange={(checked) => onInputChange('includes_screen_protector', checked === true)}
          />
          <Label 
            htmlFor="includes_screen_protector" 
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            Inclui película protetora
          </Label>
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground">Dias de Validade</Label>
          <Input
            type="number"
            min={1}
            max={365}
            step={1}
            inputMode="numeric"
            value={Number(formData.validity_days || 15)}
            onChange={(e) => onInputChange('validity_days', Number(e.target.value))}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground">Data de Expiração</Label>
          <Input
            type="text"
            placeholder="DD/MM/AAAA"
            value={formData.expires_at.includes('-') ? formatDateToDisplay(formData.expires_at) : formData.expires_at}
            onChange={handleDateChange}
            className="mt-1"
            maxLength={10}
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground">Observações</Label>
          <Textarea
            value={formData.observations}
            onChange={(e) => onInputChange('observations', e.target.value)}
            placeholder="Observações adicionais sobre o orçamento..."
            className="mt-1 min-h-[80px] resize-none"
            style={{ WebkitOverflowScrolling: 'touch' }}
          />
        </div>
      </CardContent>
    </Card>
  );
};