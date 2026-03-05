FROM node:20-alpine

# Instalar yt-dlp e ffmpeg
RUN apk add --no-cache python3 py3-pip ffmpeg
RUN pip3 install --break-system-packages yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Criar diretório de downloads
RUN mkdir -p downloads

EXPOSE 3000

CMD ["npm", "start"]
