import React, { useEffect } from 'react';

/**
 * ThemeProvider (safe)
 *
 * O projeto está “travado” em dark mode na UI (tokens e layout). Em alguns builds,
 * `next-themes` pode quebrar com "Cannot read properties of null (reading 'useContext')"
 * causando tela branca.
 *
 * Para manter o app estável, este provider aplica a classe `dark` no <html>
 * e evita depender de hooks/context externos.
 */
export type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  forcedTheme?: string;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove('light');
    el.classList.add('dark');
  }, []);

  return <>{children}</>;
}
