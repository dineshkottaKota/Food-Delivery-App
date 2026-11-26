import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

beforeEach(() => {
  if (!globalThis.URL.createObjectURL) {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
  } else {
    vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue('blob:mock-preview-url');
  }
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
