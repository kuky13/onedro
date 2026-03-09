

# Substituir botão "Sair" pelo Menu Hambúrguer na Bottom Nav do Store

## Problema
Na bottom nav mobile do `/store/*`, o último botão é "Sair" (LogOut) que volta ao dashboard. O usuário quer que seja o botão de menu hambúrguer global, dando acesso a todas as funcionalidades do sistema.

## Solução

**Arquivo:** `src/pages/store/StoreLayout.tsx`

1. Importar `useMobileMenuContext` do MobileMenuProvider
2. Substituir o botão "Sair" (linhas 158-164) pelo botão de menu hambúrguer que aciona `toggleMenu()` do contexto global
3. Usar ícone `Menu` (já importado) no lugar do `LogOut` na bottom nav
4. Como o `StoreLayout` já está dentro do `AppShell` (que provê o `MobileMenuProvider`), basta consumir o contexto

O menu hambúrguer global já tem a opção de voltar ao dashboard e todas as outras navegações, eliminando a necessidade do botão "Sair" dedicado.

