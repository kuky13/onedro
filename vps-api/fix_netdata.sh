#!/bin/bash
set -e
echo "🔧 Corrigindo conexão do Netdata..."
cd /opt/onedrip-api

# 1. Reescrever docker-compose.yml (Removendo network_mode: host do Netdata)
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # === SERVIÇOS ORIGINAIS ===
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
    volumes: ["/var/run/docker.sock:/var/run/docker.sock"]
    environment:
      - DOZZLE_USERNAME=admin
      - DOZZLE_PASSWORD=Vladivostok@134

  netdata:
    image: netdata/netdata
    container_name: netdata
    pid: host
    # network_mode: host removido para funcionar no Caddy
    restart: unless-stopped
    cap_add: ["SYS_PTRACE", "SYS_ADMIN"]
    security_opt: ["apparmor:unconfined"]
    volumes:
      - netdatalib:/var/lib/netdata
      - netdatacache:/var/cache/netdata
      - /etc/passwd:/host/etc/passwd:ro
      - /etc/group:/host/etc/group:ro
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /etc/os-release:/host/etc/os-release:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro

  caddy:
    image: caddy:alpine
    container_name: caddy-proxy
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on: ["api", "waha", "portainer", "dozzle", "netdata"]

volumes:
  caddy_data:
  caddy_config:
  waha_data:
  portainer_data:
  netdatalib:
  netdatacache:
EOF

# 2. Garantir Caddyfile correto
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

# 3. Recriar Netdata na nova rede
echo "🔄 Recriando Netdata e Caddy..."
docker compose up -d --force-recreate netdata caddy

echo "✅ Correção aplicada! Tente acessar https://monitor.kuky.help novamente."
