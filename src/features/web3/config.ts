import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { avalancheFuji } from 'wagmi/chains';

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  'avalanche-quest-local-preview';

export const wagmiConfig = getDefaultConfig({
  appName: 'Avalanche Quest',
  projectId,
  chains: [avalancheFuji],
  ssr: true,
});
