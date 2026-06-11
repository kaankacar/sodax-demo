'use client';

import { useState } from 'react';
import { useUserFormattedSummary, useMMAllowance, useMMApprove, useSupply } from '@sodax/dapp-kit';
import { useWalletProvider, useXAccount } from '@sodax/wallet-sdk-react';
import { type MoneyMarketSupplyParams } from '@sodax/sdk';
import { TOKENS, STELLAR, toBaseUnits } from '../lib/demo';
import { useMounted } from '../lib/useMounted';

export function MoneyMarketPanel() {
  const mounted = useMounted();
  const [input, setInput] = useState('5');
  const [status, setStatus] = useState<{ msg: string; kind?: 'ok' | 'bad' }>({ msg: '' });

  const account = useXAccount({ xChainType: 'STELLAR' });
  const walletProvider = useWalletProvider({ xChainId: STELLAR });

  // User portfolio summary — read key is spokeChainKey; needs a connected address.
  const { data: summary } = useUserFormattedSummary({
    params: account?.address ? { spokeChainKey: STELLAR, userAddress: account.address } : undefined,
  }) as { data?: { totalCollateralUSD?: string; totalBorrowsUSD?: string; healthFactor?: string } };

  const supplyParams: MoneyMarketSupplyParams<typeof STELLAR> | undefined = account?.address
    ? {
        srcChainKey: STELLAR,
        srcAddress: account.address,
        token: TOKENS.stellarUSDC.address,
        amount: toBaseUnits(input, TOKENS.stellarUSDC.decimals),
        action: 'supply',
      }
    : undefined;

  const { data: isApproved } = useMMAllowance({ params: supplyParams ? { payload: supplyParams } : undefined });
  const { mutateAsyncSafe: approve, isPending: approving } = useMMApprove();
  const { mutateAsyncSafe: supply, isPending: supplying } = useSupply();

  const handleSupply = async () => {
    if (!supplyParams || !walletProvider) return;
    setStatus({ msg: 'Submitting…' });
    if (!isApproved) {
      const a = await approve({ params: supplyParams, walletProvider });
      if (!a.ok) {
        setStatus({ msg: a.error instanceof Error ? a.error.message : 'Approve failed', kind: 'bad' });
        return;
      }
    }
    const r = await supply({ params: supplyParams, walletProvider });
    if (!r.ok) {
      setStatus({ msg: r.error instanceof Error ? r.error.message : 'Supply failed', kind: 'bad' });
      return;
    }
    const { srcChainTxHash } = r.value as { srcChainTxHash?: string };
    setStatus({ msg: `Supplied — ${String(srcChainTxHash ?? '?').slice(0, 14)}…`, kind: 'ok' });
  };

  const connected = mounted && Boolean(account?.address);
  const hf = Number(summary?.healthFactor);
  const noDebt = !summary?.healthFactor || hf < 0;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Supply &amp; position</h3>
        <span className="tag">sodax.moneyMarket</span>
      </div>
      <p className="sub">Supply USDC from Stellar; your position settles on the hub.</p>

      {connected && summary && (
        <div className="kvs" style={{ marginBottom: 14 }}>
          <div className="kv"><span className="k">Collateral</span><span className="v">${summary.totalCollateralUSD ?? '0'}</span></div>
          <div className="kv"><span className="k">Debt</span><span className="v">${summary.totalBorrowsUSD ?? '0'}</span></div>
          <div className="kv"><span className="k">Health factor</span>
            <span className="v" style={{ color: !noDebt && hf < 1.05 ? 'var(--bad)' : undefined }}>
              {noDebt ? '∞' : summary.healthFactor}
            </span>
          </div>
        </div>
      )}

      <label className="label">Supply {TOKENS.stellarUSDC.symbol} (from Stellar)</label>
      <div className="row">
        <input className="input" value={input} inputMode="decimal" onChange={(e) => setInput(e.target.value)} />
        <button className="btn" style={{ flex: '0 0 auto', width: 150 }}
          onClick={handleSupply} disabled={!connected || !walletProvider || approving || supplying}>
          {!connected ? 'Connect' : approving ? 'Approving…' : supplying ? 'Supplying…' : 'Supply'}
        </button>
      </div>
      <div className={`statusline ${status.kind ?? ''}`}>{status.msg}</div>
      <p className="note">Full asset list with live APYs is below. Supply/borrow/withdraw/repay all flow through the same hooks.</p>
    </div>
  );
}
