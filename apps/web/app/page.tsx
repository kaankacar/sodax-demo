import { App } from '../components/App';

// The interactive tree is wallet-driven and mounted client-only (see components/App.tsx),
// so the page prerenders to a lightweight shell — compatible with static export.
export default function Home() {
  return <App />;
}
