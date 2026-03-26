const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

const DOWNLOADS_DIR = path.join(__dirname, '../../downloads');

// Garantir que o diretório existe
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

router.post('/download', async (req, res) => {
  try {
    const { url, format = 'mp4', quality = 'best' } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL é obrigatória'
      });
    }

    // Validar URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'URL inválida'
      });
    }

    const fileId = uuidv4();
    const ext = format === 'mp3' ? 'mp3' : 'mp4';
    const filename = `${fileId}.${ext}`;
    const outputPath = path.join(DOWNLOADS_DIR, filename);

    // Mapear qualidade para yt-dlp
    const qualityMap = {
      'best': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '4320p': 'bestvideo[height<=4320][ext=mp4]+bestaudio[ext=m4a]/best[height<=4320]',
      '2160p': 'bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/best[height<=2160]',
      '1440p': 'bestvideo[height<=1440][ext=mp4]+bestaudio[ext=m4a]/best[height<=1440]',
      '1080p': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]',
      '720p': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]',
      '480p': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]',
      '360p': 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360]',
      '240p': 'bestvideo[height<=240][ext=mp4]+bestaudio[ext=m4a]/best[height<=240]',
      '144p': 'bestvideo[height<=144][ext=mp4]+bestaudio[ext=m4a]/best[height<=144]'
    };

    const formatArg = format === 'mp3' 
      ? 'bestaudio[ext=m4a]/bestaudio'
      : (qualityMap[quality] || qualityMap['best']);

    // Argumentos do yt-dlp
    const args = [
      '-f', formatArg,
      '-o', outputPath,
      '--no-playlist',
      '--no-warnings',
      '--quiet'
    ];

    if (format === 'mp3') {
      args.push('-x', '--audio-format', 'mp3');
    }

    args.push(url);

    // Executar yt-dlp
    return new Promise((resolve) => {
      const proc = spawn('yt-dlp', args);
      let stderr = '';
      let finished = false;

      const killTimer = setTimeout(() => {
        if (!finished) {
          proc.kill('SIGKILL');
          res.status(504).json({
            success: false,
            error: 'Tempo limite excedido ao processar o vídeo (5 min)',
          });
          resolve();
        }
      }, 5 * 60 * 1000);

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        finished = true;
        clearTimeout(killTimer);
        if (code !== 0) {
          console.error('yt-dlp error:', stderr);
          res.status(500).json({
            success: false,
            error: 'Falha ao processar o vídeo',
            details: stderr.slice(0, 500)
          });
          return resolve();
        }

        // Verificar se arquivo foi criado
        const finalPath = format === 'mp3' 
          ? outputPath.replace('.mp4', '.mp3')
          : outputPath;

        if (!fs.existsSync(finalPath)) {
          res.status(500).json({
            success: false,
            error: 'Arquivo não foi gerado'
          });
          return resolve();
        }

        const stats = fs.statSync(finalPath);
        const finalFilename = path.basename(finalPath);

        res.json({
          success: true,
          downloadUrl: `/downloads/${finalFilename}`,
          fileName: finalFilename,
          filename: finalFilename,
          size: stats.size,
          fileSize: stats.size
        });
        resolve();

        // Agendar limpeza do arquivo após 1 hora
        setTimeout(() => {
          try {
            if (fs.existsSync(finalPath)) {
              fs.unlinkSync(finalPath);
              console.log(`Cleaned up: ${finalFilename}`);
            }
          } catch (e) {
            console.error('Cleanup error:', e);
          }
        }, 60 * 60 * 1000);
      });

      proc.on('error', (err) => {
        finished = true;
        clearTimeout(killTimer);
        console.error('Spawn error:', err);
        res.status(500).json({
          success: false,
          error: 'yt-dlp não está instalado ou não foi encontrado',
          details: err.message
        });
        resolve();
      });
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

module.exports = router;
