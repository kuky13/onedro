import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AlphanumericPasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const AlphanumericPasswordInput: React.FC<AlphanumericPasswordInputProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Validação da senha alfanumérica
  const validatePassword = (password: string): { isValid: boolean; error: string } => {
    if (!password) {
      return { isValid: true, error: '' }; // Campo opcional
    }

    const passwordRegex = /^[a-zA-Z0-9]{4,20}$/;
    
    if (!passwordRegex.test(password)) {
      if (password.length < 4) {
        return { isValid: false, error: 'Senha deve ter pelo menos 4 caracteres' };
      }
      if (password.length > 20) {
        return { isValid: false, error: 'Senha deve ter no máximo 20 caracteres' };
      }
      if (!/^[a-zA-Z0-9]+$/.test(password)) {
        return { isValid: false, error: 'Senha deve conter apenas letras e números' };
      }
    }

    return { isValid: true, error: '' };
  };

  // Validar sempre que o valor mudar
  useEffect(() => {
    const validation = validatePassword(value);
    setIsValid(validation.isValid);
    setError(validation.error);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Permitir apenas letras e números
    if (newValue === '' || /^[a-zA-Z0-9]+$/.test(newValue)) {
      // Limitar a 20 caracteres
      if (newValue.length <= 20) {
        onChange(newValue);
      }
    }
  };

  const getInputClassName = () => {
    let baseClass = "pr-20"; // Espaço para os ícones
    
    if (value && isValid !== null) {
      if (isValid) {
        baseClass += " border-green-500 focus:border-green-500 focus:ring-green-500";
      } else {
        baseClass += " border-red-500 focus:border-red-500 focus:ring-red-500";
      }
    }
    
    return baseClass;
  };

  const getStrengthIndicator = () => {
    if (!value) return null;

    const hasLetter = /[a-zA-Z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const isLongEnough = value.length >= 6;

    let strength = 0;
    let strengthText = '';
    let strengthColor = '';

    if (hasLetter) strength++;
    if (hasNumber) strength++;
    if (isLongEnough) strength++;

    switch (strength) {
      case 1:
        strengthText = 'Fraca';
        strengthColor = 'text-red-500';
        break;
      case 2:
        strengthText = 'Média';
        strengthColor = 'text-yellow-500';
        break;
      case 3:
        strengthText = 'Forte';
        strengthColor = 'text-green-500';
        break;
      default:
        strengthText = 'Muito fraca';
        strengthColor = 'text-red-400';
    }

    return (
      <p className={`text-xs ${strengthColor}`}>
        Força da senha: {strengthText}
      </p>
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={handleChange}
          placeholder="senha123"
          disabled={disabled}
          className={getInputClassName()}
          maxLength={20}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {value && isValid !== null && (
            <div>
              {isValid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-500" />
            ) : (
              <Eye className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {value && isValid && (
        <div className="space-y-1">
          <p className="text-sm text-green-600">
            Senha válida ({value.length} caracteres)
          </p>
          {getStrengthIndicator()}
        </div>
      )}
      
      <div className="space-y-1">
        <p className="text-xs text-gray-500">
          Digite uma senha de 4 a 20 caracteres (letras e números)
        </p>
        <div className="text-xs text-gray-400 space-y-1">
          <p>• Mínimo 4 caracteres, máximo 20</p>
          <p>• Apenas letras (a-z, A-Z) e números (0-9)</p>
          <p>• Recomendado: combine letras e números</p>
        </div>
      </div>
    </div>
  );
};