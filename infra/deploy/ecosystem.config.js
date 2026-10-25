// infra/deploy/ecosystem.config.js
// PM2 process manager config for production deployment.
// Usage: pm2 start infra/deploy/ecosystem.config.js --env production

'use strict';

module.exports = {
  apps: [
    // ── NestJS API ──────────────────────────────────────────────
    {
      name: 'mastara-api',
      script: './apps/api/dist/main.js',
      cwd: '/srv/mastara',
      instances: 2,           // Run at least 2 API instances behind load balancer
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      wait_ready: true,       // Wait for process.send('ready') before routing traffic
      listen_timeout: 10000,  // Max wait for bootstrap ready signal
      kill_timeout: 5000,     // Graceful shutdown time for in-flight requests
      env: {
        NODE_ENV: 'development',
        PORT: 4001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4001,
        // All secrets injected at runtime via real env — do NOT hard-code here.
      },
      // Log rotation (requires pm2-logrotate module)
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/mastara-api-error.log',
      out_file:   '/var/log/pm2/mastara-api-out.log',
      merge_logs: true,
    },

    // ── Next.js Admin Web ────────────────────────────────────────
    {
      name: 'mastara-admin',
      // Next.js standalone output produces its own server.js
      script: './apps/admin-web/server.js',
      cwd: '/srv/mastara',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        NEXT_TELEMETRY_DISABLED: '1',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        NEXT_TELEMETRY_DISABLED: '1',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/mastara-admin-error.log',
      out_file:   '/var/log/pm2/mastara-admin-out.log',
      merge_logs: true,
    },
  ],
};
