# Exemplos de Busca de Orçamentos com IA - Estilo Worm

## Como funciona agora:
O sistema de busca da IA agora funciona exatamente como o campo de busca do `/worm`, permitindo buscas por:

### 🔍 **Busca por Número do Orçamento**
- "38" → Busca orçamento #38
- "123" → Busca orçamento #123
- "0038" → Busca orçamento #38 (com zeros)

### 📱 **Busca por Modelo do Dispositivo**
- "A12" → Galaxy A12, Samsung A12, A 12 (sinônimos automáticos)
- "iPhone 13" → iPhone 13, 13
- "Galaxy S23" → Galaxy S23, Samsung S23, S 23
- "Redmi 10" → Redmi 10, Xiaomi Redmi 10

### 🔧 **Busca por Tipo de Serviço**
- "troca de tela" → display, lcd, monitor, vidro
- "bateria" → bateria, baterias, pilha, energia
- "câmera" → camera, cameras, lente, fotografia
- "carregador" → carregador, cabo, conector, porta

### 👤 **Busca por Cliente**
- "João" → Busca por nome do cliente
- "Maria Silva" → Busca por nome completo

## 🎯 **Exemplos de Comandos Naturais**

### Comandos Simples:
- "me mostra o orçamento 38"
- "busca orçamento A12"
- "mostra orçamentos iPhone 13"
- "qual o orçamento da troca de tela do A12"

### Comandos Complexos:
- "me fale sobre orçamentos de troca de bateria do iPhone 12"
- "mostrar orçamentos do cliente João para Galaxy S22"
- "buscar orçamento 123 da Maria"

### Comandos com Números:
- "38" → Busca direta por número
- "orçamento 38" → Busca por número com contexto
- "número 38" → Busca por número

## 💡 **Dicas de Uso**

1. **Busca exata**: Digite apenas o número do orçamento (ex: "38")
2. **Busca parcial**: Use parte do modelo (ex: "A12" encontra "Galaxy A12")
3. **Sinônimos automáticos**: O sistema entende variações (ex: "tela" = "display")
4. **Múltiplos critérios**: Combine modelo + serviço (ex: "A12 trocar tela")

## 🚀 **Respostas da IA**

Agora a IA responde com:
- Número exato de orçamentos encontrados
- Detalhes completos de cada orçamento
- Sugestões de próximos passos
- Exemplos de novas buscas caso não encontre resultados

**Exemplo de resposta:**
```
🔍 **3 orçamento(s) encontrado(s) para "A12":**

1. **Orçamento #38**
   👤 João Silva
   📱 Celular Galaxy A12
   🔧 Troca de tela quebrada
   💰 À vista: R$ 280,00
   📅 15/11/2024

2. **Orçamento #42**
   👤 Maria Santos
   📱 Celular Galaxy A12
   🔧 Troca de bateria
   💰 À vista: R$ 150,00
   📅 14/11/2024

💡 **Dica:** Para enviar por WhatsApp, digite: "Enviar orçamento #NÚMERO"
```