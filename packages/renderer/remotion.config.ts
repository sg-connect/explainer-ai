import path from 'path';
import { Config } from '@remotion/cli/config';

// Reels keep their own evidence boards next to their script, outside this
// folder: REEL_DIR/boards.tsx (set by ../render-reel.sh; the demo otherwise).
// Boards import shared pieces from '@studio/ui'.
const root = process.cwd();
const reelDir = path.resolve(root, process.env.REEL_DIR ?? '../../examples/reel-demo');

Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      '@reel/boards': path.join(reelDir, 'boards.tsx'),
      '@studio': path.join(root, 'src'),
    },
    // boards live outside this folder, so let them find react/remotion here
    modules: [...(config.resolve?.modules ?? ['node_modules']), path.join(root, 'node_modules')],
  },
}));
