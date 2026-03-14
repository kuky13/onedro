## 1.Architecture design
```mermaid
graph TD
  A["User Browser"] --> B["React Frontend Application"]
  B --> C["Supabase JS SDK"]
  C --> D["Supabase Service"]

  subgraph "Frontend Layer"
    B
  end

  subgraph "Service Layer (Provided by Supabase)"
    D
  end
```

## 2.Technology Description
- Frontend: React@18 + react-router-dom@6 + tailwindcss@3 + Radix UI (shadcn/ui) + vite
- Backend: None (chamadas diretas via Supabase SDK)
- BaaS: Supabase (Auth + Database)

## 3.Route definitions
| Route | Purpose |
|-------|---------|
| /settings | Hub de configurações com navegação interna por seções (empresa, perfil, privacidade) |
| /service-orders/settings | Redirecionar para /settings |

## 6.Data model(if applicable)
### 6.1 Data model definition
```mermaid
erDiagram
  USER_PROFILES {
    uuid id
    string name
  }
```

### 6.2 Data Definition Language
User Profiles (user_profiles)
```
-- Campos mínimos observados pelo front-end
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  name TEXT
);
```
