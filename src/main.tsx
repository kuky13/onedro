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

  // Mostrar erro na tela
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background-color: #121212;
        color: white;
        font-family: Arial, sans-serif;
        padding: 20px;
        text-align: center;
      ">
        <h1 style="color: #ff4444; margin-bottom: 20px;">❌ Erro ao carregar aplicação</h1>
        <p style="margin-bottom: 10px;">Detalhes do erro:</p>
        <pre style="
          background-color: #333;
          padding: 15px;
          border-radius: 5px;
          max-width: 80%;
          overflow: auto;
          white-space: pre-wrap;
        ">${err.message}\n\n${err.stack || ''}</pre>
        <button onclick="window.location.reload()" style="
          margin-top: 20px;
          padding: 10px 20px;
          background-color: #fec832;
          color: black;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        ">Recarregar Página</button>
      </div>
    `;
  }
}