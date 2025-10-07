import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7ad046da9dcc43639dd83ac4fc7e17cf',
  appName: 'cashew-connect-suite',
  webDir: 'dist',
  server: {
    url: 'https://7ad046da-9dcc-4363-9dd8-3ac4fc7e17cf.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Geolocation: {
      permissions: ['location']
    }
  }
};

export default config;