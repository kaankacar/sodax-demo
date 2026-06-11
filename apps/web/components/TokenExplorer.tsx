'use client';

import { useState } from 'react';
import { useSodaxContext } from '@sodax/dapp-kit';
import { ChainKeys, type XToken } from '@sodax/sdk';
import { chainMeta, tokenLink, shortAddr } from '../lib/sodax';

export function TokenExplorer() {
  const { sodax } = useSodaxContext();
  const chains = sodax.config.getSupportedSpokeChains() as unknown as string[];
  const [selected, setSelected] = useState<string>(ChainKeys.STELLAR_MAINNET);

  const meta = chainMeta(sodax, selected);
  let tokens: readonly XToken[] = [];
  try {
    // getSupportedSwapTokensByChainId returns undefined (not throw) for a chain with no
    // swap-token entry — coalesce so .length is always safe.
    tokens = (sodax.config.getSupportedSwapTokensByChainId(selected as never) as readonly XToken[] | undefined) ?? [];
  } catch { /* defensive */ }

  const options = chains
    .map((k) => ({ key: k, name: chainMeta(sodax, k).name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="card full">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Token explorer</h3>
        <select className="select" style={{ width: 220 }} value={selected} onChange={(e) => setSelected(e.target.value)}>
          {options.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
        </select>
      </div>
      <p className="sub">Assets SODAX can swap/bridge on each chain. {tokens.length} token(s) on {meta.name}.</p>

      <div className="scroll">
        <table className="t">
          <thead><tr><th>Symbol</th><th>Name</th><th>Decimals</th><th>Address</th></tr></thead>
          <tbody>
            {tokens.length === 0 && <tr><td colSpan={4}>no swap tokens registered for this chain</td></tr>}
            {tokens.map((t) => {
              const href = tokenLink(meta, t.address);
              return (
                <tr key={t.address}>
                  <td className="sym">{t.symbol}</td>
                  <td style={{ fontFamily: 'inherit' }}>{t.name}</td>
                  <td>{t.decimals}</td>
                  <td>{href ? <a href={href} target="_blank" rel="noreferrer">{shortAddr(t.address)} ↗</a> : (/^0x0+$/.test(t.address) ? 'native' : shortAddr(t.address))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
