#!/bin/bash

# Script de Deploy das Edge Functions do Mercado Pago
# Uso: ./scripts/deploy-mercadopago-functions.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy das Edge Functions do Mercado Pago..."
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI não encontrado!${NC}"
    echo "Instale com: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI encontrado${NC}"

# Verificar se está logado
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Não está logado no Supabase${NC}"
    echo "Fazendo login..."
    supabase login
fi

echo -e "${GREEN}✅ Autenticado no Supabase${NC}"
echo ""

# Lista de funções para deploy
FUNCTIONS=(
    "create-mercadopago-checkout"
    "mercadopago-webhook"
    "check-mercadopago-payment"
    "send-license-email"
    "send-payment-receipt-email"
)

# Fazer deploy de cada função
for func in "${FUNCTIONS[@]}"; do
    echo -e "${YELLOW}📦 Fazendo deploy de: ${func}${NC}"
    
    if supabase functions deploy "$func"; then
        echo -e "${GREEN}✅ ${func} deployado com sucesso!${NC}"
    else
        echo -e "${RED}❌ Erro ao fazer deploy de ${func}${NC}"
        exit 1
    fi
    echo ""
done

echo -e "${GREEN}🎉 Todas as funções foram deployadas com sucesso!${NC}"
echo ""
echo "📝 Próximos passos:"
echo "1. Verifique as funções no Dashboard do Supabase"
echo "2. Configure o webhook no Mercado Pago"
echo "3. Teste a integração"
echo ""

