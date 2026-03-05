

## Otimização de Imagens — Economia de ~705 KiB

### Problema
9 logos de marcas são PNGs enormes (2000x2006px, 2758x860px, etc.) exibidos em apenas 35x35px. Total: 705KB desperdiçados.

### Solução
Substituir todos os PNGs por **SVGs inline** diretamente no código. SVGs são vetoriais, pesam ~1-3KB cada e escalam perfeitamente. Total estimado: **~15KB** vs 705KB atual.

### Plano

#### 1. Substituir logos PNG por SVGs inline (`src/pages/Index.tsx`)

Trocar o array `BRANDS` de URLs para objetos com SVG inline. Cada logo será um componente SVG simples:

- **LG**: círculo com "LG" estilizado (~1KB)
- **Huawei**: pétalas estilizadas (~2KB)
- **Realme**: texto "realme" (~1KB)
- **Samsung**: texto "SAMSUNG" (~1KB)
- **Xiaomi**: texto "Xiaomi" (~1KB)
- **Oppo**: texto "OPPO" (~1KB)
- **Apple**: maçã mordida (~1.5KB)
- **Vivo**: texto "vivo" (~1KB)
- **Motorola**: "M" estilizado com círculo (~1.5KB)

O componente `BrandsCarousel` renderizará os SVGs diretamente em vez de `<img>` tags.

#### 2. Corrigir preconnect do Supabase (`index.html`)
Adicionar `crossorigin` ao preconnect do Supabase — o SDK usa `fetch()` com headers CORS, então precisa do atributo crossorigin para o preconnect funcionar. PageSpeed indica economia de **310ms no LCP**.

### Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `src/pages/Index.tsx` | Substituir logos PNG por SVGs inline no array BRANDS e no componente BrandsCarousel |
| `index.html` | Adicionar `crossorigin` ao preconnect do Supabase |

### Impacto esperado
- **~690KB menos** de imagens transferidas
- **~310ms mais rápido** no LCP (preconnect fix)
- Zero dependência de arquivos externos para os logos

