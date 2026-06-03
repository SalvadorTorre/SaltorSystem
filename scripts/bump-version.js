const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const packageJsonPath = path.join(root, 'package.json');
const syncScriptPath = path.join(root, 'scripts', 'sync-version.js');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function bumpPatch(version) {
  const parts = String(version || '1.0.0')
    .split('.')
    .map((part) => Number(part));

  const major = Number.isFinite(parts[0]) ? parts[0] : 1;
  const minor = Number.isFinite(parts[1]) ? parts[1] : 0;
  const patch = Number.isFinite(parts[2]) ? parts[2] : 0;

  return `${major}.${minor}.${patch + 1}`;
}

const pkg = readJson(packageJsonPath);
const nextVersion = bumpPatch(pkg.version);
pkg.version = nextVersion;
writeJson(packageJsonPath, pkg);

execFileSync('node', [syncScriptPath], { cwd: root, stdio: 'inherit' });
execFileSync('git', ['add', 'package.json', 'src/environments/environment.ts', 'src/environments/environment.prod.ts'], {
  cwd: root,
  stdio: 'ignore',
});

console.log(`Version actualizada a ${nextVersion}`);
