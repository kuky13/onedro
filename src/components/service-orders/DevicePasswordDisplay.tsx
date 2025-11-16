import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Hash, Type, Grid3X3 } from 'lucide-react';
import { DevicePasswordData } from '@/hooks/useServiceOrderEdit';
import { PatternPasswordViewer } from './PatternPasswordViewer';

export interface DevicePasswordDisplayProps {
  value: DevicePasswordData;
}

export const DevicePasswordDisplay: React.FC<DevicePasswordDisplayProps> = ({
  value
}) => {
  const [showPassword, setShowPassword] = useState(false);

  // Se não há senha, não renderiza nada
  if (!value?.type || !value?.value) {
    return null;
  }

  const getPasswordTypeIcon = () => {
    switch (value.type) {
      case 'pin':
        return <Hash className="w-4 h-4" />;
      case 'abc':
        return <Type className="w-4 h-4" />;
      case 'pattern':
        return <Grid3X3 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getPasswordTypeLabel = () => {
    switch (value.type) {
      case 'pin':
        return 'PIN';
      case 'abc':
        return 'Senha';
      case 'pattern':
        return 'Padrão';
      default:
        return 'Senha';
    }
  };

  const renderPasswordValue = () => {
    if (value.type === 'pattern') {
      // Para padrões, mostrar a visualização do padrão
      return (
        <div className="space-y-2">
          <PatternPasswordViewer 
            pattern={value.value} 
            size={180}
          />
          <div className="text-center">
            <span className="text-sm text-muted-foreground">
              Padrão de desbloqueio
            </span>
          </div>
        </div>
      );
    }

    // Para PIN e senhas alfanuméricas
    return (
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          value={value.value}
          readOnly
          className="pr-12 font-mono bg-muted/50 border-border"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        {getPasswordTypeIcon()}
        <span className="text-sm text-muted-foreground font-medium">
          {getPasswordTypeLabel()} do Dispositivo
        </span>
      </div>
      {renderPasswordValue()}
    </div>
  );
};

export default DevicePasswordDisplay;