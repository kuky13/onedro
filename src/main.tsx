import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Console/Debug: manter silencioso por padrão.
// Para habilitar o console ASCII no preview, use ?debugConsole=1
import { asciiConsole } from './utils/asciiConsole';

if (import.meta.env.DEV) {
  const qs = new URLSearchParams(window.location.search);
  if (qs.get('debugConsole') === '1') {
    asciiConsole.initialize();
  }

  // Capturar erros não tratados apenas em DEV (evita ruído em produção)
  window.addEventListener('error', (event) => {
    // Ignorar AbortError silenciosamente
    if (event.error?.name === 'AbortError' || event.error?.message?.includes('aborted')) {
      return;
    }
    console.error('❌ Erro não tratado:', event.error);
    console.error('Stack trace:', event.error?.stack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    // Ignorar AbortError silenciosamente
    if (event.reason?.name === 'AbortError' || event.reason?.message?.includes('aborted')) {
      return;
    }
    console.error('❌ Promise rejeitada:', event.reason);
  });
}

try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Elemento root não encontrado!');
  }
  
  // Root element found
  
  const root = ReactDOM.createRoot(rootElement);
  // React root created
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  
  // Application rendered successfully
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error('❌ Erro ao inicializar aplicação:', err);

  // Mostrar erro na tela usando DOM seguro (sem innerHTML para evitar XSS)
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const container = document.createElement('div');
    container.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background-color:#121212;color:white;font-family:Arial,sans-serif;padding:20px;text-align:center;';

    const heading = document.createElement('h1');
    heading.textContent = '❌ Erro ao carregar aplicação';
    heading.style.cssText = 'color:#ff4444;margin-bottom:20px;';

    const label = document.createElement('p');
    label.textContent = 'Detalhes do erro:';
    label.style.marginBottom = '10px';

    const pre = document.createElement('pre');
    pre.textContent = `${err.message}\n\n${err.stack || ''}`;
    pre.style.cssText = 'background-color:#333;padding:15px;border-radius:5px;max-width:80%;overflow:auto;white-space:pre-wrap;';

    const btn = document.createElement('button');
    btn.textContent = 'Recarregar Página';
    btn.style.cssText = 'margin-top:20px;padding:10px 20px;background-color:#fec832;color:black;border:none;border-radius:5px;cursor:pointer;font-size:16px;';
    btn.addEventListener('click', () => window.location.reload());

    container.append(heading, label, pre, btn);
    rootElement.replaceChildren(container);
  }
}