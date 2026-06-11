'use client';

import { useSodaxContext } from '@sodax/dapp-kit';
import { ChainKeys } from '@sodax/sdk';
import { chainMeta } from '../lib/sodax';

export function Networks() {
  const { sodax } = useSodaxContext();
  const spokes = sodax.config.getSupportedSpokeChains() as unknown as string[];
  // Hub first, then spokes (de-duplicated).
  const ordered = [ChainKeys.SONIC_MAINNET, ...spokes.filter((s) => s !== ChainKeys.SONIC_MAINNET)];
  const rows = ordered.map((k) => ({ meta: chainMeta(sodax, k), isHub: k === ChainKeys.SONIC_MAINNET }));

  return (
    <div className="card full">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>The network graph</h3>
        <span className="tag live">{rows.length} chains</span>
      </div>
      <p className="sub">One hub (Sonic) coordinates settlement across every spoke. Stellar sits among them as a peer.</p>
      <div className="chips">
        {rows.map(({ meta, isHub }) => {
          const href = meta.explorer.baseUrl;
          const inner = (
            <>
              <span className="chip-name">{meta.name}</span>
              <span className="chip-meta">{isHub ? 'HUB' : meta.type}{meta.chainId ? ` · ${meta.chainId}` : ''}</span>
            </>
          );
          return href ? (
            <a key={meta.key} className={`chip ${isHub ? 'hub' : ''} ${meta.type === 'STELLAR' ? 'stellar' : ''}`} href={href} target="_blank" rel="noreferrer">{inner}</a>
          ) : (
            <span key={meta.key} className={`chip ${isHub ? 'hub' : ''}`}>{inner}</span>
          );
        })}
      </div>
    </div>
  );
}
