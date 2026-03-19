module.exports = {
  apps: [
    {
      name: "drippy-discord",
      script: "src/index.js",
      watch: false,
      autorestart: true,
      restart_delay: 5000,       // Espera 5s antes de reiniciar
      max_restarts: 10,          // Máximo de 10 reinicializações seguidas
      min_uptime: "30s",         // Considera crash se morrer antes de 30s
      env: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/drippy-error.log",
      out_file: "logs/drippy-out.log",
      merge_logs: true,
    },
  ],
};
