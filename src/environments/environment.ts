export const environment = {
  production: false,
  appVersion: '1.0.79',
  bypassAuth: false,
  // backendUrl: 'http://localhost:3390/api',
  backendUrl: 'https://grupohierro.duckdns.org/api',

  supabase: {
    enabled: true,
    url: 'https://saltor-supabase.tail67c2f6.ts.net',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgyMjM0NDk3LCJleHAiOjE5Mzk5MTQ0OTd9.vQu_EW7kPFdos5-QwjdDDni4KppSLeFgKrvBCZSc4n8',
    schema: 'myappdb',
  },

  //backendUrl: 'https://grupohierro.duckdns.org/api',
  // backendUrl:"http://190.166.82.95:3390/api"
  // backendUrl: 'https://8h4mmkd8-3390.use2.devtunnels.ms/api',

  //backendUrl: 'http://grupohierro.sytes.net:3390/api',
  //nuevo
};
