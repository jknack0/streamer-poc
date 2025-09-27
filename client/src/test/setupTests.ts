import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (!globalThis.crypto) {
  globalThis.crypto = {} as Crypto;
}

if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () => `test-${Math.random().toString(16).slice(2)}`;
}

export const mockClipboard = () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });

  const restore = () => {
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'clipboard', originalDescriptor);
    } else {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  };

  return { writeText, restore };
};

beforeEach(() => {
  vi.restoreAllMocks();
});
