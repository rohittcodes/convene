import { Auth0Client } from '@auth0/nextjs-auth0/server';

const appBaseUrl =
  process.env.AUTH0_BASE_URL ||
  process.env.APP_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000';

export const auth0 = new Auth0Client({
  appBaseUrl,
});

// Get the refresh token from Auth0 session
export const getRefreshToken = async () => {
  const session = await auth0.getSession();
  return session?.tokenSet?.refreshToken;
};

export const getUser = async () => {
  const session = await auth0.getSession();
  return session?.user;
};
