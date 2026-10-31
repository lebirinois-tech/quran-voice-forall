import { describe, expect, it, vi } from 'vitest';
import { paidAiUser } from '../../supabase/functions/_shared/paidAiAuth';

describe('Paid AI authentication', () => {
  it('rejects missing credentials before verification', async () => {
    const verify = vi.fn();
    expect(await paidAiUser(new Request('https://example.test'), verify)).toBeNull();
    expect(verify).not.toHaveBeenCalled();
  });
  it('rejects publishable/anon keys without a verified account', async () => {
    const req = new Request('https://example.test', { headers: { Authorization: 'Bearer public-key' } });
    expect(await paidAiUser(req, async () => ({ role: 'anon' }))).toBeNull();
  });
  it('rejects forged or expired sessions', async () => {
    const req = new Request('https://example.test', { headers: { Authorization: 'Bearer invalid' } });
    expect(await paidAiUser(req, async () => null)).toBeNull();
  });
  it('rejects anonymous signup sessions', async () => {
    const req = new Request('https://example.test', { headers: { Authorization: 'Bearer anonymous' } });
    expect(await paidAiUser(req, async () => ({ sub: 'user', role: 'authenticated', is_anonymous: true }))).toBeNull();
  });
  it('accepts a verified non-anonymous account', async () => {
    const req = new Request('https://example.test', { headers: { Authorization: 'Bearer valid' } });
    expect(await paidAiUser(req, async () => ({ sub: 'user', role: 'authenticated', is_anonymous: false }))).toBe('user');
  });
});