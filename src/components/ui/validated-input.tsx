/**
 * Componentes de Input com Validação em Tempo Real
 * Sistema OneDrip - UX Melhorada
 */

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasExcessiveZeros, smartFormatCurrency, formatCurrencyInputDetailed } from '../../utils/currency';

interface BaseValidatedFieldProps {
  label: string;
  error?: string | null;
  isValid?: boolean;
  touched?: boolean;
  required?: boolean;
  description?: string;
  className?: string;
  showValidIcon?: boolean;
}

interface ValidatedInputProps extends BaseValidatedFieldProps {
  type?: 'text' | 'email' | 'tel' | 'number' | 'password' | 'date';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  pattern?: string;
  min?: number;
  max?: number;
  step?: number;
  autoFocus?: boolean;
  maxLength?: number;
}

interface ValidatedTextareaProps extends BaseValidatedFieldProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
}

interface CurrencyInputProps extends Omit<ValidatedInputProps, 'type' | 'inputMode'> {
  fieldContext?: 'labor' | 'parts' | 'total';
}

/**
 * Input com validação em tempo real
 */
export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({
    label,
    error,
    isValid = true,
    touched = false,
    required = false,
    description,
    className,
    showValidIcon = true,
    type = 'text',
    placeholder,
    value,
    onChange,
    onBlur,
    disabled,
    autoComplete,
    inputMode,
    pattern,
    min,
    max,
    step,
    autoFocus,
    maxLength,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const hasError = touched && error;
    const isValidAndTouched = touched && isValid && !error;
    
    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
      <div className={cn('space-y-2', className)}>
        <Label className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        
        <div className="relative">
          <Input
            ref={ref}
            type={inputType}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            autoComplete={autoComplete}
            inputMode={inputMode}
            pattern={pattern}
            min={min}
            max={max}
            step={step}
            autoFocus={autoFocus}
            maxLength={maxLength}
            className={cn(
              'pr-10',
              hasError && 'border-red-300 focus:border-red-500 focus:ring-red-500',
              isValidAndTouched && showValidIcon && 'border-green-300 focus:border-green-500 focus:ring-green-500'
            )}
            {...props}
          />
          
          {/* Ícones de status */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {type === 'password' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            )}
            
            {type !== 'password' && hasError && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            
            {type !== 'password' && isValidAndTouched && showValidIcon && (
              <Check className="h-4 w-4 text-green-500" />
            )}
          </div>
        </div>
        
        {/* Descrição */}
        {description && !hasError && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        
        {/* Erro */}
        {hasError && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';

/**
 * Textarea com validação em tempo real
 */
export const ValidatedTextarea = forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  ({
    label,
    error,
    isValid = true,
    touched = false,
    required = false,
    description,
    className,
    showValidIcon = true,
    placeholder,
    value,
    onChange,
    onBlur,
    disabled,
    rows = 3,
    maxLength,
    ...props
  }, ref) => {
    const hasError = touched && error;
    const isValidAndTouched = touched && isValid && !error;
    const characterCount = value?.length || 0;

    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
          </Label>
          
          {maxLength && (
            <span className={cn(
              'text-xs',
              characterCount > maxLength * 0.9 ? 'text-orange-500' : 'text-muted-foreground',
              characterCount > maxLength ? 'text-red-500' : ''
            )}>
              {characterCount}/{maxLength}
            </span>
          )}
        </div>
        
        <div className="relative">
          <Textarea
            ref={ref}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            rows={rows}
            maxLength={maxLength}
            className={cn(
              'resize-none',
              hasError && 'border-red-300 focus:border-red-500 focus:ring-red-500',
              isValidAndTouched && showValidIcon && 'border-green-300 focus:border-green-500 focus:ring-green-500'
            )}
            {...props}
          />
          
          {/* Ícone de status */}
          {showValidIcon && (
            <div className="absolute top-3 right-3">
              {hasError && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              
              {isValidAndTouched && (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </div>
          )}
        </div>
        
        {/* Descrição */}
        {description && !hasError && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        
        {/* Erro */}
        {hasError && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

ValidatedTextarea.displayName = 'ValidatedTextarea';

/**
 * Input específico para telefone com formatação automática
 */
export const PhoneInput = forwardRef<HTMLInputElement, Omit<ValidatedInputProps, 'type' | 'inputMode'>>(
  ({ value, onChange, ...props }, ref) => {
    const formatPhone = (phone: string): string => {
      // Remove tudo que não é dígito
      const digits = phone.replace(/\D/g, '');
      
      // Aplica formatação baseada no tamanho
      if (digits.length <= 2) {
        return `(${digits}`;
      } else if (digits.length <= 6) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      } else if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      } else {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
      }
    };

    const handleChange = (newValue: string) => {
      const formatted = formatPhone(newValue);
      onChange(formatted);
    };

    return (
      <ValidatedInput
        ref={ref}
        type="tel"
        inputMode="tel"
        value={value}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

/**
 * Input específico para IMEI com formatação
 */
export const IMEIInput = forwardRef<HTMLInputElement, Omit<ValidatedInputProps, 'type' | 'inputMode'>>(
  ({ value, onChange, ...props }, ref) => {
    const formatIMEI = (imei: string): string => {
      // Remove tudo que não é dígito
      const digits = imei.replace(/\D/g, '');
      
      // Limita a 15 dígitos e adiciona hífens
      const limited = digits.slice(0, 15);
      
      if (limited.length <= 2) {
        return limited;
      } else if (limited.length <= 8) {
        return `${limited.slice(0, 2)}-${limited.slice(2)}`;
      } else if (limited.length <= 14) {
        return `${limited.slice(0, 2)}-${limited.slice(2, 8)}-${limited.slice(8)}`;
      } else {
        return `${limited.slice(0, 2)}-${limited.slice(2, 8)}-${limited.slice(8, 14)}-${limited.slice(14)}`;
      }
    };

    const handleChange = (newValue: string) => {
      const formatted = formatIMEI(newValue);
      onChange(formatted);
    };

    return (
      <ValidatedInput
        ref={ref}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder="XX-XXXXXX-XXXXXX-X"
        {...props}
      />
    );
  }
);

IMEIInput.displayName = 'IMEIInput';

/**
 * Input para valores monetários com formatação brasileira
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, fieldContext, onBlur, ...props }, ref) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [rawValue, setRawValue] = React.useState('');
    
    // Função para extrair apenas os dígitos de um valor
    const extractDigits = (str: string): string => {
      return str.replace(/\D/g, '');
    };
    
    // Função para formatar valor em reais brasileiros
    const formatToBRL = (digits: string): string => {
      if (!digits || digits === '0') return '';
      
      // Converte para número diretamente (já em reais)
      const reais = parseInt(digits, 10);
      
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(reais);
    };
    
    // Função para converter valor formatado de volta para string numérica
    const parseFromBRL = (formatted: string): string => {
      const digits = extractDigits(formatted);
      if (!digits) return '';
      
      // Retorna o valor diretamente (já em reais)
      const reais = parseInt(digits, 10);
      return reais.toString();
    };

    const handleFocus = () => {
      setIsEditing(true);
      // Ao focar, mostra o valor numérico limpo para edição
      if (value) {
        const numericValue = parseFromBRL(value);
        setRawValue(numericValue);
      }
    };

    const handleBlur = () => {
      setIsEditing(false);
      
      // Ao sair do foco, formata o valor
      if (rawValue) {
        const digits = extractDigits(rawValue.replace('.', '').replace(',', ''));
        if (digits) {
          const formatted = formatToBRL(digits);
          onChange(formatted);
        }
      } else if (!value) {
        onChange('');
      }
      
      // Chama onBlur original se fornecido
      if (onBlur) {
        onBlur();
      }
    };

    const handleChange = (newValue: string) => {
      if (isEditing) {
        // Durante a edição, permite apenas dígitos, vírgula e ponto
        const cleaned = newValue.replace(/[^\d.,]/g, '');
        setRawValue(cleaned);
        
        // Para preview em tempo real durante a edição
        const digits = extractDigits(cleaned.replace('.', '').replace(',', ''));
        if (digits && digits.length > 0) {
          const formatted = formatToBRL(digits);
          onChange(formatted);
        } else {
          onChange('');
        }
      } else {
        // Fora da edição, aceita o valor como está
        onChange(newValue);
      }
    };

    // Valor a ser exibido no input
    const displayValue = isEditing ? rawValue : value;

    return (
      <div className="relative">
        <ValidatedInput
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="0,00"
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';