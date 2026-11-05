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

const dynamicVersion = generateVersion();
console.log(`\n📦 [Build] Injected dynamic version: ${dynamicVersion} (package.json will NOT be modified)\n`);

const extraArgs = process.argv.slice(2);
const args = [
  'electron-builder',
  `--config.extraMetadata.version=${dynamicVersion}`,
  ...extraArgs
];

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawnSync(npx, args, { stdio: 'inherit', shell: true });

if (child.error) {
  console.error('❌ Build execution error:', child.error);
  process.exit(1);
}

process.exit(child.status ?? 0);

