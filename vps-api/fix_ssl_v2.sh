#!/bin/bash
set -e
echo "🔧 Solucionando problemas de SSL do Caddy (Versão Corrigida)..."

cd /opt/onedrip-api

# 1. Corrigir Caddyfile (Removendo erro de sintaxe se houver)
echo "📝 Corrigindo arquivo de configuração..."
cat > Caddyfile << 'EOF'
{
    email suporte@kuky.help
}

api.kuky.help {
    reverse_proxy api:3000
}

waha2.kuky.help {
    reverse_proxy waha:3000
}

painel.kuky.help {
    reverse_proxy portainer:9000
}

logs.kuky.help {
    reverse_proxy dozzle:8080
}

monitor.kuky.help {
    reverse_proxy localhost:19999
}
EOF

# 2. Parar TODOS os serviços para liberar os volumes
echo "🛑 Parando todos os serviços..."
docker compose down

# 3. Limpar certificados antigos
echo "🧹 Limpando dados antigos..."
docker volume rm onedrip-api_caddy_data || true
docker volume rm onedrip-api_caddy_config || true

# 4. Reiniciar tudo
echo "🚀 Reiniciando serviços..."
docker compose up -d

echo "⏳ Aguardando 10 segundos para gerar novos certificados..."
sleep 10
docker compose logs --tail=20 caddy
