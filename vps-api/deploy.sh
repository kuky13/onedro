#!/bin/bash
set -e
echo "🚀 Iniciando Configuração de Domínios e SSL..."

# 1. Instalar Docker (se necessário)
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# 2. Preparar Diretórios
mkdir -p /opt/onedrip-api/src/routes
cd /opt/onedrip-api

# 3. Criar Arquivos de Configuração
echo "📂 Atualizando configurações..."

# Caddyfile (Configuração de Domínios)
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
EOF

# Docker Compose (Infraestrutura)
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # Nossa API de Download (OneDrip)
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

  # WAHA (WhatsApp HTTP API)
  waha:
    image: devlikeapro/waha:latest
    container_name: waha-api
    restart: unless-stopped
    environment:
      - WHATSAPP_DEFAULT_ENGINE=WEBJS
      - WAHA_PRINT_QR=False
      - WAHA_DASHBOARD_ENABLED=True
    volumes:
      - waha_data:/app/.waha

  # Caddy (Servidor Web + SSL Automático)
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

volumes:
  caddy_data:
  caddy_config:
  waha_data:
EOF

# Código da API (Mantendo o original)
cat > package.json << 'EOF'
{
  "name": "onedrip-api",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": { "start": "node src/index.js" },
  "dependencies": { "express": "^4.18.2", "cors": "^2.8.5", "helmet": "^7.1.0", "ytdl-core": "^4.11.5", "uuid": "^9.0.0" }
}
EOF

cat > Dockerfile << 'EOF'
FROM node:20-alpine
RUN apk add --no-cache python3 py3-pip ffmpeg
RUN pip3 install --break-system-packages yt-dlp
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p downloads
EXPOSE 3000
CMD ["npm", "start"]
EOF

cat > src/index.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const healthRoutes = require('./routes/health');
const downloadRoutes = require('./routes/download');
const app = express();
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/downloads', express.static('downloads'));
app.use('/api', healthRoutes);
app.use('/api', downloadRoutes);
app.listen(3000, () => console.log('🚀 API running on port 3000'));
EOF

cat > src/routes/health.js << 'EOF'
const express = require('express');
const router = express.Router();
router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));
module.exports = router;
EOF

cat > src/routes/download.js << 'EOF'
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const DOWNLOADS_DIR = path.join(__dirname, '../../downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

router.post('/download', async (req, res) => {
  const { url, format = 'mp4' } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });
  const fileId = uuidv4();
  const filename = `${fileId}.${format === 'mp3' ? 'mp3' : 'mp4'}`;
  const outputPath = path.join(DOWNLOADS_DIR, filename);
  const args = ['-o', outputPath, '--no-playlist', '--quiet', url];
  if (format === 'mp3') args.push('-x', '--audio-format', 'mp3');
  
  const proc = spawn('yt-dlp', args);
  proc.on('close', (code) => {
    if (code !== 0) return res.status(500).json({ error: 'Download failed' });
    res.json({ success: true, downloadUrl: `/downloads/${filename}` });
    setTimeout(() => { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); }, 3600000);
  });
});
module.exports = router;
EOF

# 4. Aplicar Mudanças
echo "🚀 Atualizando serviços..."
docker compose down || true
docker compose up --build -d

echo "✅ Configuração Concluída!"
echo "📡 Domínios configurados (Certifique-se de apontar o DNS tipo A para 31.97.168.87):"
echo "   - api.kuky.help"
echo "   - waha2.kuky.help"
