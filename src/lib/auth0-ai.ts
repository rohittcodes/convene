import { Auth0AI, getAccessTokenForConnection } from '@auth0/ai-vercel';
import { AccessDeniedInterrupt } from '@auth0/ai/interrupts';

import { getRefreshToken, getUser } from './auth0';

// Get the access token for a connection via Auth0
export const getAccessToken = async () => getAccessTokenForConnection();

const auth0AI = new Auth0AI();

// Connection for Google services
export const withGoogleConnection = auth0AI.withTokenForConnection({
  connection: 'google-oauth2',
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/calendar.events',
  ],
  refreshToken: getRefreshToken,
  credentialsContext: 'tool-call',
});

// User confirmation for sensitive operations
export const withUserConfirmation = auth0AI.withAsyncUserConfirmation({
  userID: async () => {
    const user = await getUser();
    return user?.sub as string;
  },
  bindingMessage: async ({ action, details }) => {
    return `Do you want to ${action}? ${details ? `Details: ${details}` : ''}`;
  },
  scopes: ['openid', 'profile', 'email'],
  audience: process.env.AUTH0_AUDIENCE || process.env.AUTH0_DOMAIN,
  onAuthorizationRequest: 'block', // Wait for user confirmation
  onUnauthorized: async (e: Error) => {
    return 'Operation cancelled by user';
  },
});
