#!/bin/bash
set -e
echo "🔧 Reparando Caddyfile e reiniciando..."
cd /opt/onedrip-api

# 1. Reescrever Caddyfile (Removendo chaves extras)
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
    reverse_proxy netdata:19999
}
EOF

# 2. Reiniciar apenas o Caddy para aplicar
docker compose up -d --force-recreate caddy

echo "✅ Caddyfile corrigido e serviço reiniciado."
echo "⏳ Aguardando 5 segundos para verificar logs..."
sleep 5
docker compose logs --tail=10 caddy
