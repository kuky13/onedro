<div align="center">
  <img src="/public/lovable-uploads/logoo.png" alt="OneDrip Logo" width="120" height="120">
  
  # OneDrip

  ### *Plataforma SaaS completa para Assistências Técnicas*
  
  [![License](https://img.shields.io/badge/License-Restricted-red?style=for-the-badge)](./LICENSE)
  [![Security](https://img.shields.io/badge/Security-Hardened-green?style=for-the-badge&logo=shield)](./SECURITY.md)
  [![Stack](https://img.shields.io/badge/Stack-React_18_%7C_Vite_%7C_Supabase-blue?style=for-the-badge)](./package.json)
  
  ---
</div>

## 📋 **Índice**

- [Sobre o Projeto](#-sobre-o-projeto)
- [Arquitetura e Stack Tecnológica](#-arquitetura-e-stack-tecnológica)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Acesso ao Sistema](#-acesso-ao-sistema)
- [Módulos do Sistema](#-módulos-do-sistema)
- [Licença & Suporte](#-licença--suporte)

---

## 🪐 **Sobre o Projeto**

> **"O sistema definitivo de CRM estendido para assistências e infraestrutura PWA"**

O **OneDrip** é uma plataforma SaaS (Software as a Service) modular desenvolvida usando o que há de mais moderno no ecossistema web/mobile. Desenhado inicialmente para o gerenciamento profissional de assistências técnicas, o sistema evoluiu para uma plataforma robusta que também abriga a criação de lojas virtuais (`Stores`), fluxos nativos de Orçamentos com disparo assíncrono pro WhatsApp (`Worm`), e triagem automatizada com Inteligências Artificiais LLMs.

---

## ⚡ **Arquitetura e Stack Tecnológica**

O sistema é moldado na filosofia **Serverless** e **Offline-first**, sendo muito leve e performático não importando a banda de internet do cliente.

- **Frontend**: `React 18` construído com `Vite` (TypeScript strict). 
- **Estilização UI**: `TailwindCSS` em simbiose com componentes acessíveis baseados no `Shadcn UI` (Modais complexos, DatePickers, Sonner Toasts).
- **Core de Estado**: Praticamente todas as mutações e consumos da nuvem passam pelo gerenciamento pesado do cache pelo `@tanstack/react-query`. Caches de sessões voláteis operam com `Zustand`.
- **Backend Edge**: O coração da aplicação repousa no **Supabase**. Banco de dados PostgreSQL com RLS estrito (Row Level Security), Storage Bucket nativos e dezenas de **Edge Functions** (Serveless em Deno) para controlar tráfego com Mercado Pago, WhatsApp, SMS e disparo de emails sem pesar a conexão do usuário.
- **Progressive Web App (PWA)**: Pode ser instalável nativamente em iPhones (iOS) e Android sem envio prévio às lojas da Apple/Google.

*(Para IAs ou novos desenvolvedores, veja a pasta `/docs/` para o mapa arquitetônico detalhado 100%).*

---

## 🎯 **Funcionalidades Principais**

### 🍪 **PWA Nativo e Interface Acessível**
- ✅ **Offline-First**: Funciona de forma parcial com cache nativo.
- ✅ **Guards de Autenticação**: Múltiplos níveis estritos (`AdminGuard`, `UnifiedProtectionGuard`) protegendo acesso a rotas sensíveis a usuários sem licenças.
- ✅ **Acessibilidade Móvel**: Menus Bottom-tabs que emulam a sensação de um App nativo se acessado num Smartphone.

### 📋 **Orçamentos Inteligentes & Reparos**
- ✅ **Workflow Integrado**: Emissão de OS, gerenciamento de senhas (Grid numérico, padrão de arrastar Android), emissão de recibos térmicos em PDF (Gerados internamente via *jspdf*).
- ✅ **Checklists Interativos**: Controle minucioso de aparelhos defeituosos e triagens de entrada.
- ✅ **Catálogos em Lote**: Orçamentar serviços ou trocas de telas em frações de segundos.

### 🤖 **Integração Externa (WhatsApp e IA)**
- ✅ **Multi-Broker**: Pode se plugar nativamente.
- ✅ **Envio em 1 clique**: Dispara propostas estéticas instantâneas para o cliente.
- ✅ **Triage-AI**: LLMs nativamente integradas com contextos estritos do fluxo do seu negócio atuando como recepcionistas no chat.

### 🛒 **Store System (Lojas Virtuais)**
- ✅ Os próprios clientes do plano podem erguer pequenas lojas virtuais dinâmicas vinculadas à URL do OneDrip para vender capas, carregadores ou softwares, já com checkout nativo.

### 🍅 **Faturamento SaaS (Mercado Pago)**
- ✅ Renovação/Processamento Assíncrono via Edge Functions com o Gateway Mercado Pago para Planos Mensais e Anuais.

---

## 🚀 **Acesso ao Sistema**

### **Demo Online**
```bash
🌐 URL: https://onedrip.com.br
📧 Usuário: layla@onedrip.email
🔑 Senha: undergrounds
```

### **Página de Planos**
```bash
💰 Planos: https://onedrip.com.br/plans
📱 Suporte: WhatsApp (64) 99602-8022
```

---

## 💎 **Módulos do Sistema**

<div align="center">

| **Módulo** | **Função Central** |
|:----------:|:----------------:|
| ✅ **Reparos/Garantias** | Controle completo de assistência técnica, senhas e manutenções. |
| ✅ **Orçamentos** | Fatorador e criador de orçamentos ultra rápido com envio no whatsapp. |
| ✅ **Store System** | Páginas dinâmicas estilo E-commerce acopladas à assistência do dono. |
</div>

---

## 📄 **Licença & Suporte**

### **Licenciamento**
📋 Este software é intelectualmente protegido e licenciado sob a **Licença de Uso Restrito Oliver System** - veja [LICENSE](LICENSE) para detalhes.

### **Suporte Técnico**
- 📞 **WhatsApp**: (64) 99602-8022
- 📧 **E-mail**: suporte@onedrip.email
- 🕐 **Horário**: Segunda à Sexta, 8h às 18h

---

<div align="center">

## 🌟 **Transformando assistências técnicas em negócios de sucesso** 🚀

**Experimente o OneDrip gratuitamente e veja a diferença!**

[![Acessar Demo](https://img.shields.io/badge/🎯_Acessar_Demo-Grátis-4CAF50?style=for-the-badge&logoColor=white)](https://onedrip.com.br)
[![Ver Planos](https://img.shields.io/badge/💎_Ver_Planos-A_partir_de_R$29-2196F3?style=for-the-badge&logoColor=white)](https://onedrip.com.br/plans)
[![Suporte WhatsApp](https://img.shields.io/badge/💬_Suporte_WhatsApp-Fale_Conosco-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://chat.whatsapp.com/GPwLAJHurVnA0fJa9aWlEL)

---

**© 2026 KukySolutions / One Drip. Todos os direitos reservados.**


</div>
