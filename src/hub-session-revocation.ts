export async function revokeHubSessions(db: D1Database, issuer: string, subject: string, now = Date.now()) {
  // OIDC auth_time has second precision. Treat the whole current second as
  // potentially predating the user's revocation request.
  const cutoff = Math.floor(now / 1000) * 1000;
  await db.batch([
    db.prepare(`INSERT INTO hub_session_revocations (issuer, subject, revoked_at)
      VALUES (?, ?, ?) ON CONFLICT(issuer, subject) DO UPDATE SET
      revoked_at = MAX(revoked_at, excluded.revoked_at)`).bind(issuer, subject, cutoff),
    db.prepare('DELETE FROM auth_sessions WHERE issuer = ? AND subject = ?').bind(issuer, subject),
  ]);
}

export async function pruneHubRevocations(db: D1Database, now: number) {
  // Retain the fence longer than the authorization transaction and BFF
  // session windows, including any provider work already in flight.
  await db.prepare(`DELETE FROM hub_session_revocations WHERE rowid IN (
    SELECT rowid FROM hub_session_revocations WHERE revoked_at < ?
    ORDER BY revoked_at LIMIT 500
  )`).bind(now - 2 * 60 * 60 * 1000).run();
}
