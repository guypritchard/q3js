export async function authorizeAdmin(authorization, masterUrl, fetcher = fetch) {
  if (!masterUrl) return 503;
  if (typeof authorization !== 'string' || !/^Bearer [A-Za-z0-9._~-]{20,8192}$/.test(authorization)) return 401;
  try {
    // This existing endpoint verifies signature, expiry, issuer and admin role.
    // No claims are trusted merely because a client decoded a JWT locally.
    const response = await fetcher(new URL('/api/admin/bans', masterUrl), {
      headers: { Authorization: authorization }, signal: AbortSignal.timeout(5000), redirect: 'error', cache: 'no-store',
    });
    await response.body?.cancel();
    if (response.status === 200) return 200;
    return [401, 403].includes(response.status) ? response.status : 503;
  } catch { return 503; }
}
