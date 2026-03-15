'use strict';
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const path = require('node:path');

// 1. envsubst: replace $VAR_NAME and ${VAR_NAME} placeholders with runtime environment variables
const envFile = '/app/dist/env.js';
const content = fs.readFileSync(envFile, 'utf8').replaceAll(
  /\$\{([A-Z_][A-Z0-9_]*)\}|\$([A-Z_][A-Z0-9_]*)/g,
  (match, bracedName, unbracedName) => {
    const name = bracedName ?? unbracedName;
    return process.env[name] ?? '';
  }
);
fs.writeFileSync(envFile, content, 'utf8');

// 2. Resolve serve binary from its own package.json (version-agnostic)
const servePkgPath = require.resolve('serve/package.json');
const servePkg = JSON.parse(fs.readFileSync(servePkgPath, 'utf8'));
const serveBinRelPath = typeof servePkg.bin === 'string' ? servePkg.bin : servePkg.bin.serve;
const serveBin = path.resolve(path.dirname(servePkgPath), serveBinRelPath);

// 3. Launch serve via node directly — no shell or /usr/bin/env needed (works in distroless)
const child = spawn(process.execPath, [serveBin, '-s', 'dist', '-l', '4173'], {
  stdio: 'inherit',
  cwd: '/app',
});
child.on('exit', (code) => process.exit(code ?? 0));
