'use client';

import { useXBalances, useSodaxContext } from '@sodax/dapp-kit';
import { useXService, useXAccount } from '@sodax/wallet-sdk-react';
import { ChainKeys, type XToken } from '@sodax/sdk';
import { fromBaseUnits } from '../lib/demo';
import { useMounted } from '../lib/useMounted';

const STELLAR = ChainKeys.STELLAR_MAINNET;

export function Balances() {
  const mounted = useMounted();
  const { sodax } = useSodaxContext();
  const account = useXAccount({ xChainType: 'STELLAR' });
  const xService = useXService({ xChainType: 'STELLAR' });
  const xTokens = sodax.config.getSupportedSwapTokensByChainId(STELLAR) as readonly XToken[];

  // Auto-disabled until xService + address are present; returns Record<address, bigint>.
  const { data: balances } = useXBalances({
    params: { xService, xChainId: STELLAR, xTokens, address: account?.address ?? '' },
  }) as { data?: Record<string, bigint> };

  const connected = mounted && Boolean(account?.address);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Your Stellar balances</h3>
        <span className="tag">useXBalances</span>
      </div>
      <p className="sub">Live on-chain balances for the connected Stellar account.</p>
      {!connected ? (
        <p className="note">Connect a Stellar wallet to see balances.</p>
      ) : (
        <table className="t">
          <thead><tr><th>Asset</th><th>Balance</th></tr></thead>
          <tbody>
            {xTokens.map((t) => {
              const raw = balances?.[t.address];
              return (
                <tr key={t.address}>
                  <td className="sym">{t.symbol}</td>
                  <td>{raw === undefined ? '…' : fromBaseUnits(raw, t.decimals, 4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
