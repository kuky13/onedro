import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle } from 'lucide-react';

export interface PinPasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const PinPasswordInput: React.FC<PinPasswordInputProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');

  // Validação do PIN
  const validatePin = (pin: string): { isValid: boolean; error: string } => {
    if (!pin) {
      return { isValid: true, error: '' }; // Campo opcional
    }

    const pinRegex = /^\d{4,8}$/;
    
    if (!pinRegex.test(pin)) {
      if (pin.length < 4) {
        return { isValid: false, error: 'PIN deve ter pelo menos 4 dígitos' };
      }
      if (pin.length > 8) {
        return { isValid: false, error: 'PIN deve ter no máximo 8 dígitos' };
      }
      if (!/^\d+$/.test(pin)) {
        return { isValid: false, error: 'PIN deve conter apenas números' };
      }
    }

    return { isValid: true, error: '' };
  };

  // Validar sempre que o valor mudar
  useEffect(() => {
    const validation = validatePin(value);
    setIsValid(validation.isValid);
    setError(validation.error);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Permitir apenas números
    if (newValue === '' || /^\d+$/.test(newValue)) {
      // Limitar a 8 dígitos
      if (newValue.length <= 8) {
        onChange(newValue);
      }
    }
  };

  const getInputClassName = () => {
    let baseClass = "text-center text-lg font-mono tracking-widest";
    
    if (value && isValid !== null) {
      if (isValid) {
        baseClass += " border-green-500 focus:border-green-500 focus:ring-green-500";
      } else {
        baseClass += " border-red-500 focus:border-red-500 focus:ring-red-500";
      }
    }
    
    return baseClass;
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={handleChange}
          placeholder="0000"
          disabled={disabled}
          className={getInputClassName()}
          maxLength={8}
        />
        
        {value && isValid !== null && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isValid ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {value && isValid && (
        <p className="text-sm text-green-600">
          PIN válido ({value.length} dígitos)
        </p>
      )}
      
      <p className="text-xs text-gray-500">
        Digite um PIN de 4 a 8 dígitos numéricos
      </p>
    </div>
  );
};