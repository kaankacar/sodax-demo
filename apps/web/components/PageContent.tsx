'use client';

import { Header } from './Header';
import { Networks } from './Networks';
import { SwapPanel } from './SwapPanel';
import { Bridge } from './Bridge';
import { MoneyMarketAssets } from './MoneyMarketAssets';
import { MoneyMarketPanel } from './MoneyMarketPanel';
import { Staking } from './Staking';
import { DexPools } from './DexPools';
import { Orderbook } from './Orderbook';
import { Balances } from './Balances';
import { TokenExplorer } from './TokenExplorer';
import { Capabilities } from './Capabilities';

export function PageContent() {
  return (
    <main className="wrap">
      <Header />

      <section className="hero">
        <h2>
          One SDK. <span className="hl">20 chains.</span> Stellar as a first-class citizen.
        </h2>
        <p>
          SODAX coordinates liquidity, timing, and recovery so swaps, bridges, money-market, staking,
          and DEX actions complete across networks — settling on the Sonic hub. Everything below is
          driven by real, live SODAX endpoints.
        </p>
        <div className="pillrow">
          <span className="pill"><b>20</b> connected chains</span>
          <span className="pill"><b>26</b> money-market reserves</span>
          <span className="pill"><b>any</b> token, any spoke → any spoke</span>
          <span className="pill"><b>Stellar</b> swap · bridge · lend · stake</span>
        </div>
      </section>

      <div className="banner">
        <span className="tag warn">mainnet</span>
        SODAX is mainnet-only. Quotes, rates, limits, pools, and orders shown are all live; executing moves real funds.
      </div>

      <Networks />

      <div className="grid" style={{ marginTop: 18 }}>
        <SwapPanel />
        <Bridge />
      </div>

      <div className="grid" style={{ marginTop: 18 }}>
        <Orderbook />
        <Balances />
      </div>

      <div style={{ marginTop: 18 }}>
        <MoneyMarketAssets />
      </div>

      <div className="grid" style={{ marginTop: 18 }}>
        <MoneyMarketPanel />
        <Staking />
      </div>

      <div style={{ marginTop: 18 }}>
        <DexPools />
      </div>

      <div style={{ marginTop: 18 }}>
        <TokenExplorer />
      </div>

      <Capabilities />

      <p className="footer">
        Built on <code>@sodax/sdk</code> · <code>@sodax/dapp-kit</code> · <code>@sodax/wallet-sdk-react</code> — rc.1
      </p>
    </main>
  );
}
