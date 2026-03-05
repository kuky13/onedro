#!/bin/bash
set -e
echo "🚀 Atualizando API Key do WAHA..."
cd /opt/onedrip-api

cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  api:
    build: .
    image: onedrip-api:latest
    container_name: onedrip-api
    restart: unless-stopped
    volumes: ["./downloads:/app/downloads"]
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
    volumes: ["waha_data:/app/.waha"]
  caddy:
    image: caddy:alpine
    container_name: caddy-proxy
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on: ["api", "waha"]
volumes:
  caddy_data:
  caddy_config:
  waha_data:
EOF

echo "🔄 Reiniciando WAHA..."
docker compose up -d --force-recreate waha
echo "✅ Pronto! API Key configurada: Vladivostok@134"
