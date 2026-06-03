const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packageJsonPath = path.join(root, 'package.json');
const envFiles = [
  path.join(root, 'src/environments/environment.ts'),
  path.join(root, 'src/environments/environment.prod.ts'),
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function syncEnvironmentVersion(filePath, version) {
  const source = fs.readFileSync(filePath, 'utf8');
  const next = source.replace(
    /appVersion:\s*'[^']*'/,
    `appVersion: '${version}'`,
  );

  if (next !== source) {
    fs.writeFileSync(filePath, next, 'utf8');
  }
}

const pkg = readJson(packageJsonPath);
const version = String(pkg.version || '').trim();

if (!version) {
  throw new Error('package.json no tiene una versión válida.');
}

envFiles.forEach((filePath) => syncEnvironmentVersion(filePath, version));

console.log(`Version sincronizada: ${version}`);
