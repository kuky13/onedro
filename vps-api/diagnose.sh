#!/bin/bash
echo "🕵️‍♂️ Diagnóstico Completo..."
cd /opt/onedrip-api

echo "------------------------------------------------"
echo "1. Status dos Containers:"
docker compose ps -a

echo "------------------------------------------------"
echo "2. Portas ouvindo (Caddy está na 80/443?):"
netstat -tulpn | grep -E ':(80|443)' || echo "⚠️ Nenhuma porta 80/443 aberta!"

echo "------------------------------------------------"
echo "3. Logs Recentes do Caddy (Erros?):"
docker compose logs --tail=30 caddy

echo "------------------------------------------------"
echo "4. Firewall (UFW) está bloqueando?"
ufw status || echo "UFW não instalado"

echo "------------------------------------------------"
echo "5. Teste de conexão local (Curl no localhost):"
curl -I http://localhost:80 || echo "❌ Falha ao acessar localhost:80"
