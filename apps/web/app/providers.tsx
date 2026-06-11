'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { SodaxProvider, createSodaxQueryClient } from '@sodax/dapp-kit';
import { SodaxWalletProvider, type SodaxWalletConfig } from '@sodax/wallet-sdk-react';
import { ChainKeys, type DeepPartial, type SodaxConfig } from '@sodax/sdk';
import type { ReactNode } from 'react';

// Module-level constants — never recreate inside a component (SodaxProvider/SodaxWalletProvider
// freeze their config on first render; an inline object would churn the SDK every render).
const queryClient = createSodaxQueryClient();

const sodaxConfig: DeepPartial<SodaxConfig> = {
  chains: {
    [ChainKeys.SONIC_MAINNET]: { rpcUrl: 'https://rpc.soniclabs.com' },
    [ChainKeys.ARBITRUM_MAINNET]: { rpcUrl: 'https://arb1.arbitrum.io/rpc' },
    [ChainKeys.BASE_MAINNET]: { rpcUrl: 'https://mainnet.base.org' },
    [ChainKeys.STELLAR_MAINNET]: { rpcUrl: 'https://horizon.stellar.org' },
  },
};

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

const walletConfig: SodaxWalletConfig = {
  // EVM.ssr: true is REQUIRED for Next.js App Router (wagmi cookie hydration).
  EVM: {
    ssr: true,
    chains: {
      [ChainKeys.SONIC_MAINNET]: { rpcUrl: 'https://rpc.soniclabs.com' },
      [ChainKeys.ARBITRUM_MAINNET]: { rpcUrl: 'https://arb1.arbitrum.io/rpc' },
      [ChainKeys.BASE_MAINNET]: { rpcUrl: 'https://mainnet.base.org' },
    },
    ...(wcProjectId ? { walletConnect: { projectId: wcProjectId } } : {}),
  },
  // STELLAR: {} mounts the Stellar Wallets Kit on mainnet (WalletNetwork.PUBLIC),
  // surfacing Freighter / xBull / Lobstr / etc. through useXConnectors.
  STELLAR: {},
};

export function Providers({ children }: { children: ReactNode }) {
  // Order is load-bearing: SodaxProvider (outermost) > QueryClientProvider > SodaxWalletProvider.
  // wallet-sdk-react v2 does NOT mount its own QueryClient — the wallet hooks throw without it.
  return (
    <SodaxProvider config={sodaxConfig}>
      <QueryClientProvider client={queryClient}>
        <SodaxWalletProvider config={walletConfig}>{children}</SodaxWalletProvider>
      </QueryClientProvider>
    </SodaxProvider>
  );
}
