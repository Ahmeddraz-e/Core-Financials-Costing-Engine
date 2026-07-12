const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

function obfuscateFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const result = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.5,
      stringArray: true,
      stringArrayThreshold: 0.75,
      identifierNamesGenerator: 'hexadecimal'
    });
    fs.writeFileSync(filePath, result.getObfuscatedCode());
    console.log(`✅ Obfuscated: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Error obfuscating ${filePath}:`, error);
  }
}

function obfuscateDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) return;
  const files = fs.readdirSync(directoryPath);
  for (const file of files) {
    const fullPath = path.join(directoryPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile() && fullPath.endsWith('.js')) {
      obfuscateFile(fullPath);
    } else if (stat.isDirectory()) {
      obfuscateDirectory(fullPath);
    }
  }
}

// 1. Obfuscate backend server
const serverPath = path.join(__dirname, '../dist/server.cjs');
if (fs.existsSync(serverPath)) {
  obfuscateFile(serverPath);
}

// 2. Obfuscate frontend react build (Vite usually puts this in dist/assets)
const assetsPath = path.join(__dirname, '../dist/assets');
obfuscateDirectory(assetsPath);

console.log('🚀 Code Obfuscation completed!');
