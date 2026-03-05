#!/bin/bash
set -e
echo "🕵️‍♂️ Investigando lentidão..."
cd /opt/onedrip-api

# 1. Verificar carga do sistema (Load Average)
echo "📊 Carga do sistema:"
uptime

# 2. Verificar logs do Caddy (últimas 20 linhas)
echo "📄 Logs recentes do Caddy:"
docker compose logs --tail=20 caddy

# 3. Desativar Netdata temporariamente (pode estar pesado)
echo "🛑 Parando Netdata para teste..."
docker compose stop netdata

echo "✅ Netdata parado. Tente acessar os outros sites agora (api, waha, painel)."
echo "Se a velocidade voltar, o Netdata estava consumindo muitos recursos."
