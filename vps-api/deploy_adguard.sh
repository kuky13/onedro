#!/bin/bash
set -e
echo "🛡️ Instalando AdGuard Home..."
cd /opt/onedrip-api

# 1. Adicionar AdGuard ao docker-compose.yml
# NOTA: O AdGuard precisa das portas 53 (UDP/TCP) para DNS.
# Como o systemd-resolved do Ubuntu já usa a 53, precisamos desativá-lo antes ou usar portas diferentes.
# Vamos tentar usar a rede 'host' ou mapear portas, mas a 53 no host é crucial para ser um servidor DNS padrão.
# Para simplificar e evitar conflitos chatos de systemd, vamos rodar o AdGuard na porta 53 mapeada,
# e instruir o usuário a liberar a porta no Ubuntu se der erro.

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

  # === ADGUARD HOME ===
  adguard:
    image: adguard/adguardhome
    container_name: adguard
    restart: unless-stopped
    # Portas essenciais para DNS e Web UI
    ports:
      - "53:53/tcp"
      - "53:53/udp"
      # - "80:80/tcp" # O Caddy já usa a 80, vamos usar proxy reverso para o painel
      # - "443:443/tcp" # O Caddy já usa a 443
      - "3000:3000/tcp" # Instalação inicial (às vezes necessária)
      - "853:853/tcp"   # DNS-over-TLS (opcional)
    volumes:
      - adguard_work:/opt/adguardhome/work
      - adguard_conf:/opt/adguardhome/conf

  caddy:
    image: caddy:alpine
    container_name: caddy-proxy
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on: ["api", "waha", "portainer", "dozzle", "netdata", "adguard"]

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

# 2. Configurar Caddy para o painel do AdGuard
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

# Painel do AdGuard Home
dns.kuky.help {
    reverse_proxy adguard:3000
    # Após a configuração inicial, o AdGuard muda a porta da UI para 80 internamente ou mantém na 3000?
    # Por padrão, ele pede para escolher. Vamos configurar para ele ouvir na 3000 para a interface web.
    # Se ele mudar para 80 dentro do container, precisaremos ajustar aqui para 'reverse_proxy adguard:80'
}
EOF

# 3. Preparar o sistema para liberar a porta 53 (Ubuntu systemd-resolved conflita)
echo "🔓 Liberando porta 53 no Ubuntu..."
mkdir -p /etc/systemd/resolved.conf.d
cat > /etc/systemd/resolved.conf.d/adguardhome.conf << 'CONF'
[Resolve]
DNS=127.0.0.1
DNSStubListener=no
CONF

mv /etc/resolv.conf /etc/resolv.conf.backup
ln -s /run/systemd/resolve/resolv.conf /etc/resolv.conf

systemctl reload-or-restart systemd-resolved

echo "🚀 Subindo AdGuard Home..."
docker compose up -d

echo "✅ Instalação concluída!"
echo "👉 Acesse para configurar: https://dns.kuky.help"
echo "⚠️  IMPORTANTE: Na configuração inicial, escolha a porta 3000 para a Interface Web (já que a 80 está ocupada pelo Caddy)."
