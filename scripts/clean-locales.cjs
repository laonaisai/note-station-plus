const fs = require('fs');
const path = require('path');

/**
 * electron-builder afterPack hook
 * Ensures only supported locales (zh-CN, zh-TW, ja, en-US, ko) are packaged into the application.
 */
exports.default = async function(context) {
  const allowed = new Set(['zh-CN.pak', 'zh-TW.pak', 'ja.pak', 'en-US.pak', 'ko.pak']);
  
  // Potential locales directories depending on platform (Linux/Windows: <appOutDir>/locales)
  const candidateDirs = [
    path.join(context.appOutDir, 'locales'),
    path.join(context.appOutDir, 'resources', 'locales')
  ];

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      let removedCount = 0;
      for (const file of files) {
        if (file.endsWith('.pak') && !allowed.has(file)) {
          fs.unlinkSync(path.join(dir, file));
          removedCount++;
        }
      }
      if (removedCount > 0) {
        console.log(`🧹 [Build] Cleaned ${removedCount} unused locale files from ${dir}`);
      }
    }
  }
};
