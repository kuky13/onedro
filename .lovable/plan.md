

# Adicionar botão de voltar na página /teste-rapido

## Mudança
Adicionar um header simples no topo da página com um botão de voltar (seta ←) que navega para a página anterior usando `useNavigate(-1)`, e um título "Teste Rápido".

## Arquivo: `src/pages/TesteRapidoPage.tsx`
- Importar `useNavigate` do react-router-dom, `Button` e `ArrowLeft` do lucide-react
- Adicionar header com botão de voltar + título antes do `DeviceChecklist`

