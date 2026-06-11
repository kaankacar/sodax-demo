import { banner, c, fail, sleep } from './ui.js';
import { makeSodax } from './sodaxClient.js';
import {
  sceneIntro,
  sceneChains,
  sceneStellarTokens,
  sceneMoneyMarket,
  sceneBridge,
  sceneBuildIntent,
  sceneTrustline,
  sceneCapabilityMatrix,
} from './scenes.js';
import { sceneTestnetSigning } from './testnet.js';
import { sceneMainnetExecute } from './mainnet.js';

/** Run a scene, isolating failures so the live demo always continues. */
async function step(fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    fail(`scene error (continuing): ${(e as Error).message}`);
  }
  await sleep(process.env.TOUR_FAST ? 0 : 350); // a beat between scenes for live pacing
}

async function main(): Promise<void> {
  banner('SODAX SDK · live tour', 'execution infrastructure for modern money — a Stellar lens');

  const { sodax, initialized } = await makeSodax();

  await step(() => sceneIntro(initialized));
  await step(() => sceneChains(sodax));
  await step(() => sceneStellarTokens(sodax));
  await step(() => sceneMoneyMarket(sodax));
  await step(() => sceneBridge(sodax));
  await step(() => sceneBuildIntent(sodax));
  await step(() => sceneTrustline(sodax));
  await step(() => sceneCapabilityMatrix());
  await step(() => sceneTestnetSigning());
  await step(() => sceneMainnetExecute(sodax));

  console.log('\n' + c.green('  ✦ ') + c.bold('Tour complete.') +
    c.dim('  One SDK · 20 chains · Stellar as a first-class citizen.') + '\n');
}

main().catch((e) => {
  console.error(c.red('fatal: ' + (e as Error).stack));
  process.exit(1);
});
