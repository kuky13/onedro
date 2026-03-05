#!/bin/bash
set -e
echo "🚀 Instalando Suite de Monitoramento (Portainer + Dozzle + Netdata)..."

cd /opt/onedrip-api

# 1. Atualizar docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # === SEUS SERVIÇOS ORIGINAIS ===
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

  # === NOVOS SERVIÇOS DE MONITORAMENTO ===
  
  # 1. Portainer (Gerenciador Visual de Containers)
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    security_opt:
      - no-new-privileges:true
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - portainer_data:/data

  # 2. Dozzle (Visualizador de Logs em Tempo Real)
  dozzle:
    image: amir20/dozzle:latest
    container_name: dozzle
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - DOZZLE_USERNAME=admin
      - DOZZLE_PASSWORD=Vladivostok@134

  # 3. Netdata (Monitoramento de CPU/RAM/Rede)
  netdata:
    image: netdata/netdata
    container_name: netdata
    pid: host
    network_mode: host
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
      - /etc/os-release:/host/etc/os-release:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro

  # Caddy (Proxy Reverso)
  caddy:
    image: caddy:alpine
    container_name: caddy-proxy
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on: ["api", "waha", "portainer", "dozzle"]

volumes:
  caddy_data:
  caddy_config:
  waha_data:
  portainer_data:
  netdatalib:
  netdatacache:
EOF

# 2. Atualizar Caddyfile com novos subdomínios
cat > Caddyfile << 'EOF'
{
    email suporte@kuky.help
}

# Sua API Original
api.kuky.help {
    reverse_proxy api:3000
}

# Seu WAHA Original
waha2.kuky.help {
    reverse_proxy waha:3000
}

# === NOVOS PAINÉIS ===

# Portainer (Gerenciamento)
painel.kuky.help {
    reverse_proxy portainer:9000
}

# Dozzle (Logs)
logs.kuky.help {
    reverse_proxy dozzle:8080
}

# Netdata (Monitoramento de Recursos)
monitor.kuky.help {
    reverse_proxy localhost:19999
}
EOF

echo "🚀 Subindo novos serviços de monitoramento..."
docker compose up -d

echo "✅ Instalação Concluída!"
echo "📡 Novos Painéis Disponíveis:"
echo "   - Gerenciamento (Portainer): https://painel.kuky.help (Crie sua senha no primeiro acesso)"
echo "   - Logs (Dozzle):             https://logs.kuky.help (Login: admin / Vladivostok@134)"
echo "   - Monitoramento (Netdata):   https://monitor.kuky.help"
