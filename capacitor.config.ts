import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'me.somniavault.app',
  appName: 'Somnia',
  webDir: 'public',
  server: {
    url: 'https://www.somniavault.me/dashboard',
    cleartext: false,
  },
};

export default config;
