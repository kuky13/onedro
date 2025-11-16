const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente do arquivo .env.local na raiz do projeto
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do CORS
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware para parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint de health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

// Endpoint para testar configuração
app.get('/api/config', (req, res) => {
  res.json({
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigins: ['http://localhost:8081', 'http://localhost:3000', 'http://localhost:5173']
  });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error('❌ Erro não tratado:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚙️ Config: http://localhost:${PORT}/api/config`);
});

module.exports = app;