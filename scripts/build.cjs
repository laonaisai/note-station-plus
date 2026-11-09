const { spawnSync } = require('child_process');

function generateVersion() {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  // Format: yyyyMMdd.HH.mm (e.g. 20261105.17.55)
  return `${yyyy}${MM}${dd}.${HH}.${mm}`;
}

const rawArgs = process.argv.slice(2);
let customVersion = process.env.VITE_APP_VERSION;
const extraArgs = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg.startsWith('--version=')) {
    customVersion = arg.split('=')[1];
  } else if (arg === '--version' && i + 1 < rawArgs.length) {
    customVersion = rawArgs[++i];
  } else if (arg.startsWith('--test-version=')) {
    customVersion = arg.split('=')[1];
  } else if (arg === '--test-version' && i + 1 < rawArgs.length) {
    customVersion = rawArgs[++i];
  } else if (arg.startsWith('--app-version=')) {
    customVersion = arg.split('=')[1];
  } else if (arg === '--app-version' && i + 1 < rawArgs.length) {
    customVersion = rawArgs[++i];
  } else {
    extraArgs.push(arg);
  }
}

const dynamicVersion = customVersion || generateVersion();
process.env.VITE_APP_VERSION = dynamicVersion;

console.log(`\n📦 [Build] Dynamic version initialized: ${dynamicVersion}`);
console.log(`   (Both Vite bundle and Electron installer will use this exact version without modifying package.json)\n`);

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

// Step 1: Type check with vue-tsc
console.log('▶ [1/3] Type-checking with vue-tsc...');
const tscRes = spawnSync(npx, ['vue-tsc', '--noEmit'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});
if (tscRes.status !== 0) {
  console.error('\n❌ [Build] Type check failed with code', tscRes.status);
  process.exit(tscRes.status ?? 1);
}

// Step 2: Build frontend and electron main/preload with vite
console.log('\n▶ [2/3] Building frontend bundle and electron entrypoints with Vite...');
const viteRes = spawnSync(npx, ['vite', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});
if (viteRes.status !== 0) {
  console.error('\n❌ [Build] Vite build failed with code', viteRes.status);
  process.exit(viteRes.status ?? 1);
}

// Step 3: Package installer with electron-builder
console.log('\n▶ [3/3] Packaging installer with electron-builder...');
const builderArgs = [
  'electron-builder',
  `--config.extraMetadata.version=${dynamicVersion}`,
  ...extraArgs
];

const builderRes = spawnSync(npx, builderArgs, {
  stdio: 'inherit',
  shell: true,
  env: process.env
});
if (builderRes.status !== 0) {
  console.error('\n❌ [Build] Electron-builder packaging failed with code', builderRes.status);
  process.exit(builderRes.status ?? 1);
}

console.log(`\n🎉 [Build] Successfully built Note Station Plus v${dynamicVersion}!\n`);

