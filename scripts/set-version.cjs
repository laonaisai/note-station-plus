const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(__dirname, '../package.json');

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

try {
  const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const oldVersion = pkg.version;
  const newVersion = generateVersion();

  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  console.log(`\n📦 [Version Auto-Update] Version updated: ${oldVersion} -> ${newVersion}\n`);
} catch (error) {
  console.error('❌ Failed to update package.json version:', error);
  process.exit(1);
}

