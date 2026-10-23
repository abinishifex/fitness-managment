'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from '@/lib/api';
import type { TelegramLinkStatus } from '@/lib/types';

export default function TelegramLinkPage() {
  const [status, setStatus] = useState<TelegramLinkStatus | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [instructions, setInstructions] = useState('');
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.getTelegramStatus(token);
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function requestCode() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const data = await api.createTelegramLinkCode(token);
      setCode(data.code);
      setExpiresAt(data.expiresAt);
      setInstructions(data.instructions);
      setDeepLink(data.deepLink || null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create code');
    } finally {
      setBusy(false);
    }
  }

  const botLabel = status?.botUsername ? `@${status.botUsername}` : 'your gym Telegram bot';

  return (
    <div>
      <h1 className="display">Link Telegram</h1>
      <p className="muted">Get payment reminders in Telegram (3 days before, due day, 3 days overdue).</p>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="notice error">{error}</div>}

      {status?.linked ? (
        <div className="notice">Telegram is linked. You will receive reminders here.</div>
      ) : (
        <section className="admin-section">
          <ol className="telegram-steps">
            <li>Tap Generate code below.</li>
            <li>
              Open {botLabel}
              {status?.deepLinkBase ? (
                <>
                  {' '}
                  (
                  <a href={status.deepLinkBase} target="_blank" rel="noreferrer">
                    open bot
                  </a>
                  )
                </>
              ) : null}
              .
            </li>
            <li>
              Send <code>/start YOURCODE</code> (or just the 6-digit code).
            </li>
          </ol>
          <button type="button" className="btn" disabled={busy} onClick={() => void requestCode()}>
            {busy ? 'Generating…' : 'Generate link code'}
          </button>
          {code && (
            <div className="link-code-box">
              <p className="small muted">Your code (expires soon)</p>
              <p className="link-code">{code}</p>
              {expiresAt && (
                <p className="small muted">Expires {new Date(expiresAt).toLocaleString()}</p>
              )}
              {instructions && <p className="small muted">{instructions}</p>}
              {deepLink && (
                <p style={{ marginTop: 12 }}>
                  <a className="btn secondary" href={deepLink} target="_blank" rel="noreferrer">
                    Open bot with code
                  </a>
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
