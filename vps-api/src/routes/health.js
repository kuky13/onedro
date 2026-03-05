const express = require('express');
const router = express.Router();

const startTime = Date.now();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

module.exports = router;
