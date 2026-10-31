type VerifiedClaims = { sub?: unknown; role?: unknown; is_anonymous?: unknown };
type Verify = (token: string) => Promise<VerifiedClaims | null>;

/** Only verified account sessions may trigger billable AI requests. */
export async function paidAiUser(req: Request, verify: Verify): Promise<string | null> {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  try {
    const claims = await verify(token);
    if (!claims || claims.role !== 'authenticated' || claims.is_anonymous === true ||
      typeof claims.sub !== 'string' || !claims.sub) return null;
    return claims.sub;
  } catch { return null; }
}