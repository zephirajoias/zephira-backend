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
});
