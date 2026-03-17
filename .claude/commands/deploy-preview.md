# Deploy Preview

Verifica o status dos deployments Vercel e aciona um novo deployment do branch atual para o usuário visualizar as mudanças.

## Passos

1. **Identifique o branch atual** via `git branch --show-current`

2. **Liste os projetos Vercel** usando `mcp__Vercel__list_projects` para descobrir o Project ID e Team ID do projeto atual (cheque `.vercel/project.json` se existir para ajudar a identificar)

3. **Liste os deployments recentes** usando `mcp__Vercel__list_deployments` com o projectId e teamId encontrados, filtrando pelo branch atual

4. **Exiba o status** dos últimos deployments (URL de preview, status de build, branch, data)

5. **Se não houver deployment recente do branch atual**, oriente o usuário que o Vercel cria previews automaticamente quando há push para um branch com a integração Git ativada. Confirme que o branch foi pushed com `git log --oneline origin/<branch> -1 2>/dev/null`

6. **Se a integração Git não estiver configurada**, rode `vercel deploy` via Bash para acionar um deployment manual

## Resultado esperado

- URL de preview do branch atual para testar as mudanças antes de ir para produção
- Status claro: se o deploy já existe, se está em build, ou se precisa ser acionado
