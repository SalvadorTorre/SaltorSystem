export const environment = {
  production: false,
  appVersion: '1.0.36',
  bypassAuth: false,
  // backendUrl: 'http://localhost:3390/api',

  backendUrl: 'https://grupohierro.duckdns.org/api',
  supabase: {
    enabled: true,
    url: 'https://dslfmrecdeckuwhlhbsw.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbGZtcmVjZGVja3V3aGxoYnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzE5ODMsImV4cCI6MjA5MDMwNzk4M30.kRqiGa6MHPDR5D7FlrTjBbnUZJFLtpJIgrg7efQ9jEk',
    schema: 'myappdb',
  },
  // backendUrl:"http://190.166.82.95:3390/api"
  // backendUrl: 'https://8h4mmkd8-3390.use2.devtunnels.ms/api',

  //backendUrl: 'http://grupohierro.sytes.net:3390/api',
};
