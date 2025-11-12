module.exports = {
  apps: [
    {
      name: 'n8n',
      script: 'n8n',
      cwd: '/var/www/alu.stella-spb.ru/n8n',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        N8N_PROTOCOL: 'https',
        N8N_HOST: 'n8n.alu.stella-spb.ru',
        N8N_PORT: '5678',
        N8N_BASIC_AUTH_ACTIVE: 'true',
        N8N_BASIC_AUTH_USER: process.env.N8N_BASIC_AUTH_USER || 'admin',
        N8N_BASIC_AUTH_PASSWORD: process.env.N8N_BASIC_AUTH_PASSWORD || 'changeme',
        DB_TYPE: 'sqlite',
        DB_SQLITE_DATABASE: '/var/www/alu.stella-spb.ru/n8n/database.sqlite',
        EXECUTIONS_PROCESS: 'main',
        EXECUTIONS_DATA_SAVE_ON_SUCCESS: 'all',
        EXECUTIONS_DATA_SAVE_ON_ERROR: 'all',
        EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS: 'true',
        GENERIC_TIMEZONE: 'Europe/Moscow',
        WEBHOOK_URL: 'https://n8n.alu.stella-spb.ru/'
      }
    }
  ]
};
