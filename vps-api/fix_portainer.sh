#!/bin/bash
set -e
echo "🔄 Reiniciando Portainer para liberar acesso..."
cd /opt/onedrip-api

docker compose restart portainer

echo "✅ Portainer reiniciado!"
echo "🏃‍♂️ CORRA! Você tem 5 minutos para criar a senha de admin em:"
echo "👉 https://painel.kuky.help"
