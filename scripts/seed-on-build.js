const { spawnSync } = require('node:child_process');

function hasDbConfig() {
  return Boolean(
    process.env.DATABASE_URL_UNPOOLED ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.PGHOST
  );
}

function run() {
  if (process.env.RUN_SEED_ON_BUILD !== 'true') {
    console.log('Skipping seed during build (RUN_SEED_ON_BUILD is not "true").');
    return;
  }

  if (!hasDbConfig()) {
    console.error('RUN_SEED_ON_BUILD=true but no database connection env vars were found.');
    process.exit(1);
  }

  console.log('RUN_SEED_ON_BUILD=true, running seed before Next.js build...');
  const result = spawnSync('npm', ['run', 'seed'], { stdio: 'inherit', env: process.env });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run();
