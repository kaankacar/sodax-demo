import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'SODAX × Stellar — SDK demo',
  description: 'Cross-chain swaps, money market, and live signing on Stellar via the SODAX SDK.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // The SODAX wallet providers are wagmi-backed and cannot be server-prerendered,
  // so they are mounted client-only inside <App> (see components/App.tsx).
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
