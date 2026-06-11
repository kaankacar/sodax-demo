'use client';

import { WalletConnect } from './WalletConnect';

export function Header() {
  return (
    <header className="nav">
      <div className="brand">
        <div className="logo">S</div>
        <div>
          <h1>SODAX × Stellar</h1>
          <p>execution infrastructure for modern money</p>
        </div>
      </div>
      <WalletConnect />
    </header>
  );
}
