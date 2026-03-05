#!/bin/bash
set -e
echo "🔧 Solucionando problemas de SSL do Caddy..."

cd /opt/onedrip-api

# 1. Limpar certificados antigos (forçar renovação)
echo "🧹 Limpando dados antigos do Caddy..."
docker compose stop caddy
docker volume rm onedrip-api_caddy_data || true
docker volume rm onedrip-api_caddy_config || true

# 2. Verificar DNS (Teste simples de ping)
echo "🔍 Verificando se os domínios apontam para este servidor..."
IP=$(curl -s ifconfig.me)
echo "ℹ️  IP do Servidor: $IP"
echo "------------------------------------------------"
echo "Se os domínios não apontarem para $IP, o SSL falhará."

# 3. Reiniciar Caddy com logs detalhados
echo "🚀 Reiniciando Caddy..."
docker compose up -d caddy

# 4. Mostrar logs recentes para debug
echo "📄 Logs recentes do Caddy (procure por erros de 'challenge'):"
sleep 5
docker compose logs --tail=20 caddy

echo "------------------------------------------------"
echo "✅ Reinicialização concluída."
echo "👉 Se houver erros acima, verifique seus registros DNS na Hostinger."
