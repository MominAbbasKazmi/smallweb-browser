import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchSites } from './apiClient.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API errors', () => {
  it('preserves the server status and message for UI error handling', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({
        error: { message: 'Search is temporarily unavailable.' }
      })
    })));

    await expect(searchSites('tidepool')).rejects.toMatchObject({
      message: 'Search is temporarily unavailable.',
      status: 503
    });
  });
});
