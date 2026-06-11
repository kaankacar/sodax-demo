'use client';

import { useState } from 'react';
import { useSodaxContext } from '@sodax/dapp-kit';
import { ChainKeys } from '@sodax/sdk';
import { useSodaxRead, chainMeta } from '../lib/sodax';
import { fromBaseUnits } from '../lib/demo';

export function Bridge() {
  const { sodax } = useSodaxContext();
  const chains = sodax.config.getSupportedSpokeChains() as unknown as string[];

  // Source chains that actually have USDC registered (excluding Stellar, the destination).
  const sources = chains.filter(
    (k) => k !== ChainKeys.STELLAR_MAINNET && !!sodax.config.findSupportedTokenBySymbol(k as never, 'USDC'),
  );
  const [src, setSrc] = useState<string>(
    sources.includes(ChainKeys.ARBITRUM_MAINNET) ? ChainKeys.ARBITRUM_MAINNET : (sources[0] ?? ChainKeys.ARBITRUM_MAINNET),
  );

  const { data, loading } = useSodaxRead(async (s) => {
    const from = s.config.findSupportedTokenBySymbol(src as never, 'USDC');
    const to = s.config.findSupportedTokenBySymbol(ChainKeys.STELLAR_MAINNET, 'USDC');
    if (!from || !to) return null;
    const bridgeable = s.bridge.isBridgeable({ from, to });
    const r = await s.bridge.getBridgeableAmount(from, to);
    return r.ok ? { bridgeable, amount: r.value.amount, decimals: r.value.decimals, type: r.value.type } : { bridgeable, amount: 0n, decimals: 7, type: 'n/a' };
  }, [src]);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Bridge limits</h3>
        <span className="tag live">live read</span>
      </div>
      <p className="sub">Maximum USDC bridgeable into Stellar right now — a no-wallet `getBridgeableAmount` read.</p>

      <label className="label">Source chain (USDC → Stellar)</label>
      <select className="select" value={src} onChange={(e) => setSrc(e.target.value)}>
        {sources.map((k) => <option key={k} value={k}>{chainMeta(sodax, k).name}</option>)}
      </select>

      <div className="kvs" style={{ marginTop: 14 }}>
        <div className="kv"><span className="k">isBridgeable</span>
          <span className="v">{loading ? '…' : data?.bridgeable ? '✓ true' : 'false'}</span>
        </div>
        <div className="kv"><span className="k">max bridgeable</span>
          <span className="v">{loading || !data ? '…' : `${fromBaseUnits(data.amount, data.decimals, 2)} USDC`}</span>
        </div>
        <div className="kv"><span className="k">limit type</span>
          <span className="v">{loading || !data ? '…' : data.type}</span>
        </div>
      </div>
    </div>
  );
}
