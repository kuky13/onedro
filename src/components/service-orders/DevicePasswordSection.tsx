import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Hash, Type, Grid3X3 } from 'lucide-react';
import { DevicePasswordData, DevicePasswordType } from '@/hooks/useServiceOrderEdit';
import { PinPasswordInput } from './PinPasswordInput';
import { AlphanumericPasswordInput } from './AlphanumericPasswordInput';
import { PatternPasswordGrid } from './PatternPasswordGrid';

export interface DevicePasswordSectionProps {
  value: DevicePasswordData;
  onChange: (data: DevicePasswordData) => void;
  disabled?: boolean;
  error?: string;
}

export const DevicePasswordSection: React.FC<DevicePasswordSectionProps> = ({
  value,
  onChange,
  disabled = false,
  error
}) => {
  // Garantir que value sempre tenha uma estrutura válida
  const safeValue: DevicePasswordData = value || { type: null, value: '' };

  const handleTypeChange = (type: DevicePasswordType | 'none') => {
    if (type === 'none') {
      onChange({
        type: null,
        value: ''
      });
    } else {
      onChange({
        type,
        value: ''
      });
    }
  };

  const handleValueChange = (newValue: string, metadata?: any) => {
    const next: DevicePasswordData = {
      ...safeValue,
      value: newValue,
      ...(metadata !== undefined ? { metadata } : {})
    };

    onChange(next);
  };

  const renderPasswordInput = () => {
    switch (safeValue.type) {
      case 'pin':
        return (
          <PinPasswordInput
            value={safeValue.value}
            onChange={handleValueChange}
            disabled={disabled}
          />
        );
      case 'abc':
        return (
          <AlphanumericPasswordInput
            value={safeValue.value}
            onChange={handleValueChange}
            disabled={disabled}
          />
        );
      case 'pattern':
        return (
          <PatternPasswordGrid
            value={safeValue.value}
            onChange={handleValueChange}
            disabled={disabled}
            metadata={safeValue.metadata}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Senha do Dispositivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password-type" className="text-sm font-medium">
            Tipo de Senha
          </Label>
          <Select
            value={safeValue.type || 'none'}
            onValueChange={(val) => handleTypeChange(val as DevicePasswordType | 'none')}
            disabled={disabled}
          >
            <SelectTrigger id="password-type" className="w-full">
              <SelectValue placeholder="Selecione o tipo de senha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="flex items-center gap-2">
                  Nenhuma senha
                </span>
              </SelectItem>
              <SelectItem value="pin">
                <span className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  PIN (Numérico)
                </span>
              </SelectItem>
              <SelectItem value="abc">
                <span className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  ABC (Alfanumérico)
                </span>
              </SelectItem>
              <SelectItem value="pattern">
                <span className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  PADRÃO (Grid 3x3)
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {safeValue.type && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white">
              {safeValue.type === 'pin' && 'Digite o PIN (4-8 dígitos)'}
              {safeValue.type === 'abc' && 'Digite a senha alfanumérica (4-20 caracteres)'}
              {safeValue.type === 'pattern' && 'Desenhe o padrão de desbloqueio'}
            </Label>
            {renderPasswordInput()}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 mt-1">{error}</p>
        )}
      </CardContent>
    </Card>
  );
};