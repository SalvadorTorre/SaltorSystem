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

function parseVersion(version) {
  const parts = String(version || '1.0.0')
    .split('.')
    .map((part) => Number(part));

  return {
    major: Number.isFinite(parts[0]) ? parts[0] : 1,
    minor: Number.isFinite(parts[1]) ? parts[1] : 0,
    patch: Number.isFinite(parts[2]) ? parts[2] : 0,
  };
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function nextVersion(currentVersion) {
  const current = parseVersion(currentVersion);
  const runNumber = Number(process.env.GITHUB_RUN_NUMBER || 0);
  const runAttempt = Number(process.env.GITHUB_RUN_ATTEMPT || 1);

  if (process.env.GITHUB_ACTIONS === 'true' && Number.isFinite(runNumber) && runNumber > 0) {
    return formatVersion({
      ...current,
      patch: current.patch + runNumber * 10 + Math.max(0, runAttempt - 1),
    });
  }

  return formatVersion({
    ...current,
    patch: current.patch + 1,
  });
}

const pkg = readJson(packageJsonPath);
const previousVersion = String(pkg.version || '').trim();
const preparedVersion = nextVersion(previousVersion);

pkg.version = preparedVersion;
writeJson(packageJsonPath, pkg);

execFileSync(process.execPath, [syncScriptPath], { cwd: root, stdio: 'inherit' });

console.log(`Desktop version preparada: ${previousVersion} -> ${preparedVersion}`);
