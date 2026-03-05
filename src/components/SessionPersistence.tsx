/**
 * Componente de Persistência de Sessão Universal
 * Salva automaticamente o conteúdo de inputs de texto para evitar perda de dados em reloads
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const SessionPersistence = () => {
  const location = useLocation();

  useEffect(() => {
    // Lista de tipos de input para ignorar (segurança)
    const ignoredTypes = ['password', 'checkbox', 'radio', 'file', 'hidden'];
    
    // Função para gerar uma chave única para o input
    const getInputKey = (el: HTMLInputElement | HTMLTextAreaElement) => {
      const identifier = el.id || el.name;
      if (!identifier) return null;
      // Chave baseada na rota e no identificador do elemento
      return `session_draft_${location.pathname}_${identifier}`;
    };

    // Handler para salvar dados
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      
      // Apenas inputs de texto e textareas
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;
      if (target.tagName === 'INPUT' && ignoredTypes.includes((target as HTMLInputElement).type)) return;
      
      const key = getInputKey(target);
      if (key) {
        if (target.value.trim()) {
          localStorage.setItem(key, target.value);
          // Salvar timestamp para limpeza posterior
          localStorage.setItem(`${key}_timestamp`, Date.now().toString());
        } else {
          localStorage.removeItem(key);
          localStorage.removeItem(`${key}_timestamp`);
        }
      }
    };

    // Rotas excluídas da restauração (segurança / conflito com React state)
    const excludedRoutes = ['/auth', '/sign', '/login', '/register'];

    // Restaurar dados ao montar ou mudar de rota (sem popups)
    const restoreDrafts = () => {
      // Não restaurar em páginas de autenticação
      if (excludedRoutes.some(route => location.pathname.startsWith(route))) return;

      const inputs = document.querySelectorAll('input, textarea');

      inputs.forEach((input: any) => {
        if (input.tagName === 'INPUT' && ignoredTypes.includes(input.type)) return;

        const key = getInputKey(input);
        if (!key) return;

        const savedValue = localStorage.getItem(key);
        if (!savedValue) return;

        // Usar native value setter para que React detecte a mudança em inputs controlados
        const nativeSetter = input.tagName === 'TEXTAREA'
          ? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
          : Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

        if (nativeSetter) {
          nativeSetter.call(input, savedValue);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    };

    // Limpar drafts antigos (mais de 3 dias)
    const cleanupOldDrafts = () => {
      const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('session_draft_') && key.endsWith('_timestamp')) {
          const timestamp = parseInt(localStorage.getItem(key) || '0');
          if (now - timestamp > THREE_DAYS) {
            const baseKey = key.replace('_timestamp', '');
            localStorage.removeItem(baseKey);
            localStorage.removeItem(key);
          }
        }
      }
    };

    window.addEventListener('input', handleInput);
    
    // Listener para limpar rascunhos de uma página específica
    const handleClearDrafts = (e: any) => {
      const path = e.detail?.path || location.pathname;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`session_draft_${path}`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    };

    window.addEventListener('clear-session-drafts', handleClearDrafts);
    
    // Pequeno delay para garantir que o formulário foi renderizado
    const timer = setTimeout(() => {
      restoreDrafts();
    }, 1000);

    cleanupOldDrafts();

    return () => {
      window.removeEventListener('input', handleInput);
      window.removeEventListener('clear-session-drafts', handleClearDrafts);
      clearTimeout(timer);
    };
  }, [location.pathname]);

  // Este componente não renderiza nada visualmente
  return null;
};

// Helper para disparar a limpeza de drafts
export const clearSessionDrafts = (path?: string) => {
  window.dispatchEvent(new CustomEvent('clear-session-drafts', { detail: { path } }));
};
