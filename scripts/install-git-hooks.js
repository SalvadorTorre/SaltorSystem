const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const hooksDir = path.join(root, '.githooks');

try {
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
    cwd: root,
    stdio: 'ignore',
  });

  console.log('Git hooks configured in .githooks');
} catch (error) {
  console.warn('No se pudieron configurar los git hooks automáticamente.');
  if (error && error.message) {
    console.warn(error.message);
  }
}
