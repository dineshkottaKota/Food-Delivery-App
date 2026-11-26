import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../../Backend');

function resolveFromBackend() {
  const importer = path.join(backendRoot, 'package.json');
  return {
    name: 'resolve-from-backend',
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
  root: backendRoot,
  plugins: [resolveFromBackend()],
  server: {
    fs: {
      allow: [backendRoot, __dirname],
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['../testcases/backend/**/*.test.js'],
    setupFiles: ['../testcases/backend/setup.js'],
  },
};
