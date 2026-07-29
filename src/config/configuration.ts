import 'dotenv/config';

export default () => ({
  jwt: {
    privateKey: (process.env.JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    publicKey: (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n'),
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrlAdmin: process.env.GOOGLE_CALLBACK_URL_ADMIN,
    callbackUrlUser: process.env.GOOGLE_CALLBACK_URL_USER,
  },
});
