const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '..', 'src');

function collectJsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('backend source syntax', () => {
  const jsFiles = collectJsFiles(SRC_DIR);

  test('finds JavaScript files under src/', () => {
    expect(jsFiles.length).toBeGreaterThan(0);
  });

  test.each(jsFiles.map((file) => [path.relative(SRC_DIR, file), file]))(
    '%s parses without syntax errors',
    (_relativePath, file) => {
      expect(() => execFileSync(process.execPath, ['--check', file])).not.toThrow();
    }
  );
});
