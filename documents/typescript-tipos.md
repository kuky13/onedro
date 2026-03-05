# 🏷️ Tipos e Interfaces Críticas do Sistema

> [!NOTE]
> Este documento cataloga as interfaces e tipos TypeScript mais úteis e de suma importância espalhados na arquitetura do projeto.

---

## 🛠️ 1. Ordens de Serviço (OS)

### `ServiceOrderData`
Tipo colossal principal para criação/edição de Ordem de Serviço. Inclui campos sensíveis de senha do dispositivo, grids de checklist e links de fotos AWS/Storage.

```typescript
interface ServiceOrderData {
  id?: string;
  owner_id: string; // Amarra RLS
  client_name: string;
  client_phone: string;
  device_type: string;
  device_model: string;
  device_serial?: string;
  reported_issue: string; // Problema relatado
  password_type?: DevicePasswordType; 
  password_value?: string;
  pattern_password?: number[]; // Matrix [0..8] para grids do android
  checklist?: Record<string, boolean>;
  photos?: string[];
  status: string;
}
```

### `DevicePasswordType`
União dos enums possíveis de uma senha de celular registrada:
*Valores possíveis:* `"pin" | "pattern" | "password" | "none" | "biometric"`

---

## 🐛 2. Orçamentos (Módulo Worm)

### `Budget` (via Supabase Relational Types)
Tipo "canônico" e autogerado pelo Supabase CLI: `Database["public"]["Tables"]["budgets"]["Row"]`. 
*   Contém colunas pesadas como: `client_name`, `device_model`, `total_price`, `workflow_status`.

### `BudgetPartData`
Especifica a linha temporal de um item/peça dento de um orçamento.
```typescript
interface BudgetPartData {
  name: string;
  price: number;
  quantity: number;
  installment_count: number;
  cash_price?: number;
  installment_price?: number;
  warranty_months?: number; // Meses de garantia legal 
  part_type?: string; 
}
```

---

## 👤 3. Usuários e Autenticação

### `UserProfile`
O espelho da persona logada guardado em `user_profiles`:
*   Apresenta: `id`, `email`, `full_name`, `avatar_url`, `is_blocked`, `phone`.
*   Possui a hierarquia sensível atrelada: `role` e flag `is_god`.

### `UserRole`
*Valores limitados à:* `"user" | "admin" | "superadmin"`

### `AuthContextType`
É a espinha dorsal de todo o contexto embutido que espalha pelo componente App.
*   Puxa variáveis em tempo real: `user: User | null`, `session: Session | null`, `isLoading: boolean`.
*   E embute funções injetáveis de log-out: `signIn()`, `signUp()`, `signOut()`.

---

## 🏢 4. Empresa / Loja Virtual (Store)

### `CompanyInfo`
Os dados cruciais que carimbam todas as OS/PDFs exportados daquele CNPJ através da table `company_info`:
*   `name`, `logo_url`, `address`, `phone`, `cnpj`, `whatsapp_phone`.
*   Configurações legais persistentes do comércio: `warranty_cancellation_terms`, `warranty_legal_reminders`.

### `StoreData`
O perfil público que molda a URL `/loja/nomedaloja`: 
*   Campos: `slug`, `store_name`, `theme_color`, `is_published`, atributos `SEO` meta-description.

---

## 🔬 5. Diagnóstico de Dispositivos (Mobile Diagnostics)

### `TestSession`
Gerenciamento temporal gerado para quando o cliente está testando falhas no touch/fone do seu próprio smartphone por URL mágica (WebApp diagnostics).

```typescript
interface TestSession {
  id: string;
  share_token: string;
  status: "pending" | "in_progress" | "completed";
  device_info?: Json; 
  test_results?: Json; // Pass/Fail logs
  overall_score?: number; // Saúde total %
  service_order_id?: string;
}
```

---

## 💳 6. Pagamentos & Checkout

### `CheckoutParams`
```typescript
interface CheckoutParams {
  plan_type: string;
  billing_interval: "monthly" | "yearly";
  coupon_code?: string;
  user_id: string; // Para criar a webhook associativa depois do Pay
}
```

### `PixPaymentData`
Os dados devolvidos limpos do integrador Mercado Pago que a View precisa mostrar no *QRCode* modal: 
*   Campos: `qr_code`, `qr_code_base64`, `amount`, `external_reference`.

---

## 📌 7. Tabela Pessoal de Referência Rápida

| Objeto / Tipo | Arquivo de Origem | Principalmente Usado Em |
|------|---------------|----------|
| `ServiceOrderData` | Tipagem manual (`src/types/`) | Telas de Criação/edição de Ordem Serviço |
| `Budget` | Gerado nativo (`supabase/types.ts`) | Módulo Worm CRM, Utilitário jspdf |
| `UserProfile` | Gerado nativo (`supabase/types.ts`) | Contextos Globais, Auth Guard |
| `CompanyInfo` | Gerado nativo (`supabase/types.ts`) | Settings Gerais, Cabeçalho de Impressão |
| `CheckoutParams`| Tipagem manual (`src/types/`) | API wrapper de Checkout MP |
| `DevicePasswordType` | Tipagem manual (`src/types/`) | Pattern grid UI |
