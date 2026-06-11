import { StellarWalletProvider } from '@sodax/wallet-sdk-core';
import {
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
  Horizon,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { env } from './env.js';
import { c, scene, ok, info, warn, fail, kv, note, link, raw } from './ui.js';

// Testnet-specific Horizon (NOT the generic STELLAR_HORIZON_URL, which may point at
// mainnet for the live-execution scene — a mainnet Horizon would break this scene).
const HORIZON = process.env.STELLAR_TESTNET_HORIZON_URL?.trim() || 'https://horizon-testnet.stellar.org';
const FRIENDBOT = 'https://friendbot.stellar.org';
const PASSPHRASE = Networks.TESTNET;

/**
 * REAL end-to-end signing on the Stellar TESTNET using the SODAX
 * `StellarWalletProvider` (private-key mode). SODAX's protocol is mainnet-only,
 * but the wallet provider's signing path is the very same code a mainnet swap
 * would call — so this proves the provider works, live, with no pre-funded keys.
 *
 * Flow: friendbot-fund a fresh account → provider signs a `changeTrust`
 * (the exact Stellar primitive a SODAX delivery depends on) → broadcast →
 * wait for the receipt → an issuer pays the asset in, proving it lands.
 */
export async function sceneTestnetSigning(): Promise<void> {
  scene(
    'REAL signing on Stellar testnet (live tx hashes)',
    'Same StellarWalletProvider a mainnet swap uses — friendbot-funded, zero setup.',
  );

  const server = new Horizon.Server(HORIZON);

  // 1) Our account: provided secret, or a fresh keypair (then friendbot-funded).
  const userKp = env.stellarTestnetSecret
    ? Keypair.fromSecret(env.stellarTestnetSecret)
    : Keypair.random();
  if (!env.stellarTestnetSecret) {
    info('No STELLAR_TESTNET_SECRET set — generating a throwaway keypair.');
  }
  await friendbot(userKp.publicKey(), 'signer');

  // 2) Build the SODAX provider. NOTE: privateKey is the Stellar SECRET SEED
  //    ("S…"), NOT a 0x hex key — the provider runs Keypair.fromSecret() inside.
  const provider = new StellarWalletProvider({
    type: 'PRIVATE_KEY',
    privateKey: userKp.secret() as `0x${string}`, // type says Hex; runtime wants the S-seed
    network: 'TESTNET',
    defaults: { pollInterval: 2_000, pollTimeout: 45_000 },
  });
  const signer = await provider.getWalletAddress();
  kv('provider.getWalletAddress()', signer);
  link('account', `https://stellar.expert/explorer/testnet/account/${signer}`);

  // 3) An asset issuer (also friendbot-funded) to trust + receive.
  const issuerKp = Keypair.random();
  await friendbot(issuerKp.publicKey(), 'issuer');
  const demo = new Asset('SODAX', issuerKp.publicKey());
  kv('asset to trust', `${demo.getCode()}:${shorten(demo.getIssuer())}`);

  // 4) Build the unsigned changeTrust XDR with @stellar/stellar-sdk.
  const account = await server.loadAccount(signer);
  const unsignedXdr = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset: demo }))
    .setTimeout(180)
    .build()
    .toXDR();
  info('Built unsigned changeTrust XDR → handing it to the provider to sign…');

  // 5) Provider signs (returns signed XDR), then WE broadcast (PK mode does not).
  const signedXdr = await provider.signTransaction(unsignedXdr);
  ok('provider.signTransaction() returned a signed XDR.');
  const submit = await server.submitTransaction(
    TransactionBuilder.fromXDR(signedXdr, PASSPHRASE),
  );
  ok(`Broadcast! trustline tx confirmed in ledger ${pluck(submit, 'ledger')}`);
  link('trustline tx', `https://stellar.expert/explorer/testnet/tx/${submit.hash}`);

  // 6) Confirm via the provider's own receipt poller.
  const receipt = await provider.waitForTransactionReceipt(submit.hash, {
    pollInterval: 2_000,
    pollTimeout: 45_000,
  });
  kv('waitForTransactionReceipt', `successful=${pluck(receipt, 'successful')}  hash=${shorten(submit.hash)}`);

  // 7) Issuer pays the asset in — proving it actually lands now the trustline exists.
  const issuerAcct = await server.loadAccount(issuerKp.publicKey());
  const payTx = new TransactionBuilder(issuerAcct, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
    .addOperation(Operation.payment({ destination: signer, asset: demo, amount: '100' }))
    .setTimeout(180)
    .build();
  payTx.sign(issuerKp);
  const payResp = await server.submitTransaction(payTx);
  ok('Issuer delivered 100 SODAX to the signer — exactly how a SODAX swap lands an asset.');
  link('payment tx', `https://stellar.expert/explorer/testnet/tx/${payResp.hash}`);

  raw(c.gray('  ┆'));
  note('On mainnet, sodax.swaps.swap({ …, walletProvider }) wraps this same sign→broadcast→settle.');
}

async function friendbot(addr: string, who: string): Promise<void> {
  try {
    const res = await fetch(`${FRIENDBOT}?addr=${encodeURIComponent(addr)}`);
    if (res.ok) ok(`friendbot funded the ${who} (${shorten(addr)}).`);
    else info(`${who} likely already funded (friendbot ${res.status}).`);
  } catch (e) {
    warn(`friendbot unreachable for ${who}: ${(e as Error).message}`);
    throw e;
  }
}

function shorten(s: string): string {
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}
// Horizon response types are loose across sdk versions; pluck defensively.
function pluck(obj: unknown, key: string): string {
  const v = (obj as Record<string, unknown>)?.[key];
  return v === undefined || v === null ? '?' : String(v);
}
