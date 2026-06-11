'use client';

import {
  useXConnectors,
  useXConnect,
  useXAccount,
  useXDisconnect,
  sortConnectors,
  type IXConnector,
} from '@sodax/wallet-sdk-react';
import type { ChainType } from '@sodax/sdk';
import { useMounted } from '../lib/useMounted';
import { short } from '../lib/demo';

type KitConnector = IXConnector & { icon?: string; isInstalled?: boolean; installUrl?: string };

const SLOTS: { type: ChainType; label: string; preferred: string[]; install: { name: string; url: string } }[] = [
  { type: 'STELLAR', label: 'Stellar', preferred: ['freighter', 'xbull', 'lobstr'], install: { name: 'Freighter', url: 'https://www.freighter.app/' } },
  { type: 'EVM', label: 'EVM', preferred: ['metaMask', 'metamask', 'hana'], install: { name: 'MetaMask', url: 'https://metamask.io/' } },
];

export function WalletConnect() {
  const mounted = useMounted();
  if (!mounted) return <button className="btn stellar sm" disabled>Connect wallet</button>;
  return (
    <div className="row" style={{ width: 'auto', gap: 8 }}>
      {SLOTS.map((s) => <ConnectSlot key={s.type} {...s} />)}
    </div>
  );
}

function ConnectSlot({ type, label, preferred, install }: { type: ChainType; label: string; preferred: string[]; install: { name: string; url: string } }) {
  const connectors = sortConnectors(useXConnectors({ xChainType: type }), { preferred }) as KitConnector[];
  const { mutateAsync: connect, isPending } = useXConnect();
  const account = useXAccount({ xChainType: type });
  const disconnect = useXDisconnect();

  if (account?.address) {
    return (
      <span className="addr" title={account.address}>
        <span className="dim">{label}:</span> {short(account.address)}
        <button className="linkbtn" onClick={() => disconnect({ xChainType: type })} aria-label={`Disconnect ${label}`}>✕</button>
      </span>
    );
  }

  const installed = connectors.filter((c) => c.isInstalled);
  const target = installed[0];
  if (!target) {
    return <a className={`btn ${type === 'STELLAR' ? 'stellar' : 'ghost'} sm`} href={install.url} target="_blank" rel="noreferrer">Install {install.name}</a>;
  }
  return (
    <button className={`btn ${type === 'STELLAR' ? 'stellar' : 'ghost'} sm`} disabled={isPending}
      onClick={() => connect(target).catch(() => { /* user rejected */ })}>
      {isPending ? '…' : `Connect ${label}`}
    </button>
  );
}
