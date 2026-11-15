import { describe, expect, it } from 'vitest';
import manifestSource from '../../public/manifest.webmanifest?raw';

describe('installed app screen rotation', () => {
  it('allows both portrait and landscape instead of locking the phone upright', () => {
    const manifest = JSON.parse(manifestSource);
    expect(manifest.orientation).toBe('any');
  });
});