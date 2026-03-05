#!/bin/bash
set -e
echo "🛡️ Instalando AdGuard Home (Versão Corrigida)..."
cd /opt/onedrip-api

# 1. Configurar docker-compose.yml (YAML validado)
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # === SERVIÇOS ORIGINAIS ===
  api:
    build: .
    image: onedrip-api:latest
    container_name: onedrip-api
    restart: unless-stopped
    volumes:
      - ./downloads:/app/downloads
    environment:
      - NODE_ENV=production
      - PORT=3000
      - ALLOWED_ORIGINS=*

  waha:
    image: devlikeapro/waha:latest
    container_name: waha-api
    restart: unless-stopped
    environment:
      - WHATSAPP_DEFAULT_ENGINE=WEBJS
      - WAHA_PRINT_QR=False
      - WAHA_API_KEY=Vladivostok@134
      - WAHA_DASHBOARD_ENABLED=True
      - WAHA_DASHBOARD_USERNAME=kuky.png@gmail.com
      - WAHA_DASHBOARD_PASSWORD=Vladivostok@134
    volumes:
      - waha_data:/app/.waha

  # === MONITORAMENTO ===
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

  dozzle:
    image: amir20/dozzle:latest
    container_name: dozzle
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - DOZZLE_USERNAME=admin
      - DOZZLE_PASSWORD=Vladivostok@134

  netdata:
    image: netdata/netdata
    container_name: netdata
    restart: unless-stopped
    cap_add:
      - SYS_PTRACE
      - SYS_ADMIN
    security_opt:
      - apparmor:unconfined
    volumes:
      - netdatalib:/var/lib/netdata
      - netdatacache:/var/cache/netdata
      - /etc/passwd:/host/etc/passwd:ro
      - /etc/group:/host/etc/group:ro
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro

  # === ADGUARD HOME ===
  adguard:
    image: adguard/adguardhome
    container_name: adguard
    restart: unless-stopped
    ports:
      - "53:53/tcp"
      - "53:53/udp"
      - "3000:3000/tcp"
      - "853:853/tcp"
    volumes:
      - adguard_work:/opt/adguardhome/work
      - adguard_conf:/opt/adguardhome/conf

  caddy:
    image: caddy:alpine
    container_name: caddy-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - api
      - waha
      - portainer
      - dozzle
      - netdata
      - adguard

volumes:
  caddy_data:
  caddy_config:
  waha_data:
  portainer_data:
  netdatalib:
  netdatacache:
  adguard_work:
  adguard_conf:
EOF

echo "🚀 Subindo containers..."
docker compose up -d

echo "✅ Instalação concluída!"
echo "👉 Acesse: https://dns.kuky.help"
echo "⚠️  IMPORTANTE: Na instalação, escolha porta 3000 para Interface Web e porta 53 para DNS."
