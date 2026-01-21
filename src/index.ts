import { createApp } from './app';
import { env } from './config/env';
import { clickhouse } from './config/clickhouse';
import { initTradingTables } from './modules/trading/database.init';
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
async function bootstrap() {
  try {
    await clickhouse.connect();

    // Initialize trading tables
    await initTradingTables();

    const app = createApp();

    app.listen(env.port, () => {
      console.log('==========================================');
      console.log('  MIMIQ BACKEND STARTED');
      console.log('==========================================');
      console.log(`🚀 Server: http://localhost:${env.port}`);
      console.log(`📊 Environment: ${env.nodeEnv}`);
      console.log(`🌐 API: http://localhost:${env.port}/api`);
      console.log(`📈 Health: http://localhost:${env.port}/api/health`);
      console.log('==========================================');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await clickhouse.disconnect();
  process.exit(0);
});
