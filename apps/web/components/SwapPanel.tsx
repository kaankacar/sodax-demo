'use client';

import { useMemo, useState } from 'react';
import { useQuote, useSwap, useSwapApprove, useSwapAllowance, useSodaxContext } from '@sodax/dapp-kit';
import { useWalletProvider, useXAccount, getXChainType } from '@sodax/wallet-sdk-react';
import { ChainKeys, type SpokeChainKey, type XToken, type CreateIntentParams } from '@sodax/sdk';
import { chainMeta } from '../lib/sodax';
import { toBaseUnits, fromBaseUnits } from '../lib/demo';
import { useMounted } from '../lib/useMounted';

function safeBig(v: unknown): bigint {
  const s = String(v ?? '0');
  try { return s.includes('.') ? BigInt(s.split('.')[0] || '0') : BigInt(s); } catch { return 0n; }
}

export function SwapPanel() {
  const mounted = useMounted();
  const { sodax } = useSodaxContext();

  // Chains that actually have swap-routable tokens.
  const allSpokes = sodax.config.getSupportedSpokeChains() as unknown as SpokeChainKey[];
  const tokensOf = (c: SpokeChainKey): readonly XToken[] => {
    try { return sodax.config.getSupportedSwapTokensByChainId(c) as readonly XToken[]; } catch { return []; }
  };
  const swapChains = allSpokes.filter((c) => tokensOf(c).length > 0);
  const firstToken = (c: SpokeChainKey) => tokensOf(c)[0]?.address ?? '';

  const [srcChain, setSrcChain] = useState<SpokeChainKey>(ChainKeys.STELLAR_MAINNET);
  const [dstChain, setDstChain] = useState<SpokeChainKey>(ChainKeys.ARBITRUM_MAINNET);
  const [srcTokenAddr, setSrcTokenAddr] = useState<string>(
    sodax.config.findSupportedTokenBySymbol(ChainKeys.STELLAR_MAINNET, 'USDC')?.address ?? firstToken(ChainKeys.STELLAR_MAINNET),
  );
  const [dstTokenAddr, setDstTokenAddr] = useState<string>(
    sodax.config.findSupportedTokenBySymbol(ChainKeys.ARBITRUM_MAINNET, 'USDC')?.address ?? firstToken(ChainKeys.ARBITRUM_MAINNET),
  );
  const [input, setInput] = useState('10');
  const [dst, setDst] = useState('');
  const [status, setStatus] = useState<{ msg: string; kind?: 'ok' | 'bad' }>({ msg: '' });

  const srcTokens = tokensOf(srcChain);
  const dstTokens = tokensOf(dstChain);
  const srcToken = srcTokens.find((t) => t.address === srcTokenAddr) ?? srcTokens[0];
  const dstToken = dstTokens.find((t) => t.address === dstTokenAddr) ?? dstTokens[0];

  const amount = srcToken ? toBaseUnits(input, srcToken.decimals) : 0n;
  const sameToken = srcChain === dstChain && srcToken?.address === dstToken?.address;
  const quotable = !!srcToken && !!dstToken && amount > 0n && !sameToken;

  // Wallet for the SOURCE chain (whatever type it is). srcChain is always a valid
  // spoke, so getXChainType never returns undefined here.
  const xType = getXChainType(srcChain)!;
  const account = useXAccount({ xChainType: xType });
  const walletProvider = useWalletProvider({ xChainId: srcChain });

  // Live quote for ANY supported pair — no wallet required.
  const { data: quote, isLoading: quoting } = useQuote({
    params: {
      payload: quotable
        ? {
            token_src: srcToken!.address,
            token_dst: dstToken!.address,
            token_src_blockchain_id: srcChain,
            token_dst_blockchain_id: dstChain,
            amount,
            quote_type: 'exact_input',
          }
        : undefined,
    },
  });

  const quotedRaw = quote?.ok ? (quote.value as { quoted_amount?: unknown }).quoted_amount : undefined;
  const minOutputAmount = (safeBig(quotedRaw) * 99n) / 100n; // 1% slippage tolerance

  const intentParams: CreateIntentParams | undefined = useMemo(() => {
    if (!quotable || !account?.address || !quote?.ok || !srcToken || !dstToken) return undefined;
    return {
      inputToken: srcToken.address,
      outputToken: dstToken.address,
      inputAmount: amount,
      minOutputAmount,
      deadline: 0n,
      allowPartialFill: false,
      srcChainKey: srcChain,
      dstChainKey: dstChain,
      srcAddress: account.address,
      dstAddress: dst,
      data: '0x',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotable, account?.address, quote?.ok, srcToken?.address, dstToken?.address, amount, minOutputAmount, dst, srcChain, dstChain]);

  const { data: isApproved } = useSwapAllowance({
    params: intentParams ? { payload: intentParams, srcChainKey: srcChain, walletProvider } : undefined,
  });
  const { mutateAsyncSafe: approve, isPending: approving } = useSwapApprove();
  const { mutateAsyncSafe: swap, isPending: swapping } = useSwap();

  const handleSwap = async () => {
    if (!intentParams || !walletProvider || !dst) {
      setStatus({ msg: 'Enter a destination address on the target chain.', kind: 'bad' });
      return;
    }
    setStatus({ msg: 'Submitting…' });
    if (!isApproved) {
      const a = await approve({ params: intentParams, walletProvider });
      if (!a.ok) { setStatus({ msg: a.error instanceof Error ? a.error.message : 'Approve failed', kind: 'bad' }); return; }
    }
    const r = await swap({ params: intentParams, walletProvider });
    if (!r.ok) { setStatus({ msg: r.error instanceof Error ? r.error.message : 'Swap failed', kind: 'bad' }); return; }
    const info = r.value.intentDeliveryInfo as Record<string, unknown>;
    setStatus({ msg: `Settled — src ${String(info?.srcTxHash ?? '?').slice(0, 14)}…`, kind: 'ok' });
  };

  const connectedForSrc = mounted && Boolean(account?.address) && Boolean(walletProvider);
  const out = quote?.ok && dstToken ? fromBaseUnits(safeBig(quotedRaw), dstToken.decimals, 4) : null;
  // The solver returns "no path" for amounts outside its liquidity band — surface a friendly hint.
  const noQuote = quotable && !quoting && !!quote && !quote.ok;
  // Note: rc.1 quote value is just { quoted_amount } and is already net of the solver fee.
  const feePct = quote?.ok ? (quote.value as { fee_percent?: unknown }).fee_percent : undefined;

  const chainOpt = (c: SpokeChainKey) => <option key={c} value={c}>{chainMeta(sodax, c).name}</option>;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Cross-chain swap</h3>
        <span className="tag live">any route · live quote</span>
      </div>
      <p className="sub">Pick any supported asset on any spoke → any other. Quotes are live from the solver.</p>

      <label className="label">From</label>
      <div className="row">
        <select className="select" value={srcChain}
          onChange={(e) => { const v = e.target.value as SpokeChainKey; setSrcChain(v); setSrcTokenAddr(firstToken(v)); }}>
          {swapChains.map(chainOpt)}
        </select>
        <select className="select" value={srcToken?.address ?? ''} onChange={(e) => setSrcTokenAddr(e.target.value)}>
          {srcTokens.map((t) => <option key={t.address} value={t.address}>{t.symbol}</option>)}
        </select>
      </div>

      <label className="label">To</label>
      <div className="row">
        <select className="select" value={dstChain}
          onChange={(e) => { const v = e.target.value as SpokeChainKey; setDstChain(v); setDstTokenAddr(firstToken(v)); }}>
          {swapChains.map(chainOpt)}
        </select>
        <select className="select" value={dstToken?.address ?? ''} onChange={(e) => setDstTokenAddr(e.target.value)}>
          {dstTokens.map((t) => <option key={t.address} value={t.address}>{t.symbol}</option>)}
        </select>
      </div>

      <label className="label">Amount ({srcToken?.symbol ?? '—'})</label>
      <input className="input" value={input} inputMode="decimal" onChange={(e) => setInput(e.target.value)} />

      <label className="label">Destination address (on {chainMeta(sodax, dstChain).name})</label>
      <input className="input" value={dst} placeholder={xTypePlaceholder(dstChain)} onChange={(e) => setDst(e.target.value)} />

      <div className="kvs" style={{ marginTop: 14 }}>
        <div className="kv"><span className="k">You receive (est.)</span>
          <span className="v">{sameToken ? 'pick a different asset' : quoting ? '…' : out ? `${out} ${dstToken?.symbol}` : noQuote ? 'no path at this size' : '—'}</span>
        </div>
        <div className="kv"><span className="k">Route</span><span className="v">{srcChain} → {dstChain}</span></div>
        <div className="kv"><span className="k">Quote</span><span className="v">{out ? 'net of solver fee' : '—'}</span></div>
      </div>
      {noQuote && <p className="note" style={{ color: 'var(--warn)' }}>No solver path at this amount — try a different size (e.g. 1–1000 for stablecoins) or a major-token route (USDC · USDT · ETH · XLM · bnUSD).</p>}

      <div style={{ marginTop: 16 }}>
        <button className="btn" onClick={handleSwap} disabled={!connectedForSrc || !intentParams || approving || swapping}>
          {!connectedForSrc ? `Connect a ${xType} wallet to swap` : approving ? 'Approving…' : swapping ? 'Swapping…' : 'Swap on mainnet'}
        </button>
      </div>
      <div className={`statusline ${status.kind ?? ''}`}>{status.msg}</div>
      <p className="note">Quote works with no wallet. Execution signs on the source chain — connect a wallet of that chain type (the header connects Stellar). Real funds move on mainnet.</p>
    </div>
  );
}

function xTypePlaceholder(chain: SpokeChainKey): string {
  if (chain === ChainKeys.STELLAR_MAINNET) return 'G… (Stellar address)';
  if (chain === ChainKeys.SOLANA_MAINNET) return 'base58 Solana address';
  return '0x… address';
}
