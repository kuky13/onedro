#!/bin/bash
set -e
echo "🔧 Configurando SSL para o AdGuard..."
cd /opt/onedrip-api

# 1. Atualizar Caddyfile (Adicionando o DNS que faltou)
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

dns.kuky.help {
    reverse_proxy adguard:3000
}
EOF

# 2. Reiniciar Caddy
echo "🚀 Reiniciando Proxy..."
docker compose restart caddy

echo "⏳ Aguardando certificado..."
sleep 5
docker compose logs --tail=10 caddy

echo "✅ Pronto! Tente acessar https://dns.kuky.help"
