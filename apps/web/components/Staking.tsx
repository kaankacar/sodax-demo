'use client';

import { useStakingConfig, useStakeRatio, useInstantUnstakeRatio, useConvertedAssets } from '@sodax/dapp-kit';

const ONE = 10n ** 18n; // SODA / xSODA are 18 decimals

export function Staking() {
  // All hub-only, wallet-free reads (unwrapped values; React Query handles errors).
  const { data: cfg } = useStakingConfig() as { data?: { unstakingPeriod?: bigint; minUnstakingPeriod?: bigint; maxPenalty?: bigint } };
  const { data: stakeRatio } = useStakeRatio({ params: { amount: ONE } }) as { data?: readonly [bigint, bigint] };
  const { data: instant } = useInstantUnstakeRatio({ params: { amount: ONE } }) as { data?: bigint };
  const { data: converted } = useConvertedAssets({ params: { amount: ONE } }) as { data?: bigint };

  const rate = converted !== undefined ? Number(converted) / 1e18 : undefined;          // SODA per xSODA (vault rate)
  const xPerSoda = stakeRatio ? Number(stakeRatio[0]) / 1e18 : undefined;                // xSODA per SODA
  const instantRate = instant !== undefined ? Number(instant) / 1e18 : undefined;        // SODA per xSODA (instant)
  const days = cfg?.unstakingPeriod !== undefined ? Number(cfg.unstakingPeriod) / 86_400 : undefined;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>SODA staking</h3>
        <span className="tag live">live config</span>
      </div>
      <p className="sub">Stake SODA → xSODA; the vault rate climbs as rewards accrue. Unstake over a cooldown or exit early for a penalty.</p>

      <div className="kvs" style={{ marginTop: 6 }}>
        <div className="kv"><span className="k">1 xSODA =</span><span className="v">{rate ? `${rate.toFixed(4)} SODA` : '…'}</span></div>
        <div className="kv"><span className="k">Stake 1 SODA →</span><span className="v">{xPerSoda ? `${xPerSoda.toFixed(4)} xSODA` : '…'}</span></div>
        <div className="kv"><span className="k">Instant-unstake 1 xSODA →</span><span className="v">{instantRate ? `${instantRate.toFixed(4)} SODA` : '…'}</span></div>
        <div className="kv"><span className="k">Unstaking cooldown</span><span className="v">{days !== undefined ? `${days.toFixed(0)} days` : '…'}</span></div>
        <div className="kv"><span className="k">Max early-exit penalty</span><span className="v">{cfg?.maxPenalty !== undefined ? `${cfg.maxPenalty.toString()}%` : '…'}</span></div>
      </div>
      <p className="note">SDK: <code>sodax.staking.stake / unstake / claim</code> · hooks <code>useStake</code>, <code>useUnstake</code>, <code>useClaimRewards</code>.</p>
    </div>
  );
}
