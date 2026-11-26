import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, '../../Admin');
const adminRequire = createRequire(path.join(adminRoot, 'package.json'));
const { default: react } = await import(pathToFileURL(adminRequire.resolve('@vitejs/plugin-react')).href);

function resolveFromAdmin() {
  const importer = path.join(adminRoot, 'package.json');
  return {
    name: 'resolve-from-admin',
    enforce: 'pre',
    async resolveId(source, currentImporter, options) {
      if (
        !currentImporter ||
        !path.resolve(currentImporter).startsWith(__dirname) ||
        source.startsWith('.') ||
        source.startsWith('/') ||
        source.startsWith('\0') ||
        source.startsWith('node:') ||
        /^[a-zA-Z]:[\\/]/.test(source)
      ) {
        return null;
      }
      return this.resolve(source, importer, { ...options, skipSelf: true });
    },
  };
}

export default {
  root: adminRoot,
  plugins: [resolveFromAdmin(), react()],
  server: {
    fs: {
      allow: [adminRoot, __dirname],
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['../testcases/admin/setup.js'],
    include: ['../testcases/admin/**/*.test.{js,jsx}'],
  },
};
