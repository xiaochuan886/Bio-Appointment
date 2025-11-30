import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';

import { miaodaDevPlugin } from "miaoda-sc-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr({
      svgrOptions: {
        icon: true, exportType: 'named', namedExport: 'ReactComponent', }, }), miaodaDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: [
      // Node.js native modules
      'pg',
      'pg-pool',
      'redis',
      'bcrypt',
      'jsonwebtoken',
      'aws-sdk',
      'mock-aws-s3',
      'nock',
      'node-pre-gyp',
      '@mapbox/node-pre-gyp',
      // Other Node.js specific packages
      'generic-pool',
      'safe-buffer',
      'rimraf',
      'nopt',
      'npmlog',
      'are-we-there-yet',
      'signal-exit',
      'glob',
      'minimatch',
      'readable-stream',
      'stream',
      'util',
      'url',
      'crypto',
      'fs',
      'path',
      'os',
      'buffer',
      'events',
      'child_process',
      'process',
      'zlib',
      'http',
      'https',
      'net',
      'tls',
      'dns',
      'dgram',
      'tty',
      'querystring',
      'url',
      'string_decoder'
    ]
  },
  define: {
    // Define environment variables for browser compatibility
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'global': 'globalThis'
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    hmr: {
      overlay: false
    }
  },
  build: {
    rollupOptions: {
      external: [
        // Node.js native modules
        'pg',
        'redis',
        'bcrypt',
        'jsonwebtoken'
      ]
    }
  }
});
