import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '../../Frontend');
const frontendRequire = createRequire(path.join(frontendRoot, 'package.json'));
const { default: react } = await import(pathToFileURL(frontendRequire.resolve('@vitejs/plugin-react')).href);

function resolveFromFrontend() {
  const importer = path.join(frontendRoot, 'package.json');
  return {
    name: 'resolve-from-frontend',
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
  root: frontendRoot,
  plugins: [resolveFromFrontend(), react()],
  server: {
    fs: {
      allow: [frontendRoot, __dirname],
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['../testcases/frontend/setup.js'],
    include: ['../testcases/frontend/**/*.test.{js,jsx}'],
  },
};
