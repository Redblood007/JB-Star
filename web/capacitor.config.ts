import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jbstar.user',
  appName: 'JB-Star',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
