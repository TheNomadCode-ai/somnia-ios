import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'me.somniavault.app',
  appName: 'Somnia',
  webDir: 'public',
  server: {
    url: 'https://www.somniavault.me',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#c9a84c',
      sound: 'default',
    },
  },
};

export default config;
