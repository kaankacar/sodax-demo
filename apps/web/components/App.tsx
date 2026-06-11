'use client';

import { Providers } from '../app/providers';
import { PageContent } from './PageContent';
import { useMounted } from '../lib/useMounted';

/**
 * Client-only entry point. The SODAX wallet providers read a Zustand store that
 * is only valid in the browser, so we mount the whole provider tree AFTER the
 * first client render. Server / prerender shows a lightweight shell — no hooks,
 * no providers — which is what makes `next build` succeed.
 */
export function App() {
  const mounted = useMounted();

  if (!mounted) {
    return (
      <main className="wrap">
        <header className="nav">
          <div className="brand">
            <div className="logo">S</div>
            <div>
              <h1>SODAX × Stellar</h1>
              <p>execution infrastructure for modern money</p>
            </div>
          </div>
        </header>
        <div className="card" style={{ marginTop: 24 }}>Initializing SODAX…</div>
      </main>
    );
  }

  return (
    <Providers>
      <PageContent />
    </Providers>
  );
}
