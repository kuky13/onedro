
## Diagnóstico

Achei a causa principal no que já está rodando:

1. **O nome da instância está chegando no backend**
   - Os logs mostram `get_groups for cookie1`
   - Também mostram `Resolved token for "cookie1"`
   - Então o campo **já está sendo usado**, mas hoje ele dispara consulta **enquanto você digita**, inclusive para valores parciais como `o` e `on`

2. **A autenticação da instância está funcionando**
   - `GET /user/contacts` retorna contatos
   - Isso prova que o token da instância foi resolvido e aceito pela Evolution GO

3. **O erro real é na lógica de grupos**
   - `GET /group/myall` responde `200` com `{"data":null,"message":"success"}`
   - O código atual trata isso como “sucesso final” e **não cai para o fallback**
   - Resultado: a tela recebe lista vazia e mostra “Nenhum grupo encontrado”

## O que vou implementar

### 1. Fazer o campo “Nome da Instância” consultar só o valor confirmado
Hoje a busca acontece a cada tecla. Vou ajustar a UI para separar:

- **valor digitado**
- **valor confirmado para busca**

Fluxo novo:
```text
Você digita: cookie1
↓
clica em “Buscar grupos” / Enter
↓
o sistema usa exatamente "cookie1"
```

Isso evita consultas com `o`, `on`, etc. e garante que o sistema procure exatamente a instância informada.

### 2. Corrigir o fallback de grupos no `whatsapp-proxy`
Vou mudar a lógica de `get_groups` para:

- tentar `GET /group/myall`
- se vier `data: null`, array vazio ou resposta sem grupos, **não considerar sucesso**
- tentar `GET /group/list`
- se ainda vier vazio, buscar chats/contacts e filtrar grupos (`@g.us`)
- só devolver vazio depois de esgotar tudo

Hoje o fallback só acontece quando há erro HTTP. Vou fazer fallback também quando houver **sucesso vazio**.

### 3. Normalizar melhor respostas da Evolution GO
Vou ampliar a leitura dos formatos possíveis de grupo, usando campos como:

- `id`
- `jid`
- `Jid`
- `remoteJid`
- `JID`
- `subject`
- `name`
- `pushName`

Isso reduz risco de a API devolver grupos em outro shape e a UI ignorar.

### 4. Melhorar o feedback na tela
Na área de grupos vou exibir algo como:

- instância consultada
- fonte usada (`group/myall`, `group/list` ou fallback por contacts/chats)
- mensagem mais clara quando a instância existe mas a Evolution não devolve grupos

Assim fica fácil saber se:
- a instância foi encontrada
- o token foi resolvido
- os grupos vieram vazios da própria Evolution

## Arquivos a ajustar

- `src/components/super-admin/WhatsAppManagement.tsx`
- `supabase/functions/whatsapp-proxy/index.ts`

## Resultado esperado

Depois disso:

- o sistema vai procurar **exatamente o nome que você confirmar no campo**
- não vai mais consultar instâncias parciais enquanto digita
- se `group/myall` vier vazio, ele vai continuar tentando outros caminhos
- a chance de os grupos aparecerem aumenta bastante, porque hoje o fluxo para cedo demais

## Detalhes técnicos

```text
Problema atual:
input = cookie1
→ token resolvido corretamente
→ /group/myall = 200 { data: null }
→ código encerra como sucesso
→ UI recebe []

Fluxo corrigido:
input confirmado = cookie1
→ token resolvido corretamente
→ /group/myall vazio
→ tentar /group/list
→ se vazio, tentar contacts/chats e filtrar @g.us
→ normalizar retorno
→ UI exibe grupos encontrados
```

## Validação após implementar

1. Abrir `/supadmin/whatsapp`
2. Digitar `cookie1`
3. Confirmar a busca
4. Ver se a tela mostra a instância consultada
5. Ver se os grupos aparecem
6. Se ainda vier vazio, os logs já vão indicar claramente em qual etapa parou
