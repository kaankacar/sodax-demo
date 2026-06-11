// When building for GitHub Pages we emit a fully static export served from a
// repo subpath (https://kaankacar.github.io/sodax-demo/). The app is entirely
// client-rendered against SODAX's live APIs, so static hosting works perfectly.
const isPages = process.env.GITHUB_PAGES === 'true';
const repo = 'sodax-demo';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isPages ? `/${repo}` : undefined,
  assetPrefix: isPages ? `/${repo}/` : undefined,
  // The @sodax/* rc packages and their web3 deps ship modern ESM; transpile them.
  transpilePackages: [
    '@sodax/sdk',
    '@sodax/dapp-kit',
    '@sodax/wallet-sdk-react',
    '@sodax/wallet-sdk-core',
    '@sodax/types',
  ],
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
