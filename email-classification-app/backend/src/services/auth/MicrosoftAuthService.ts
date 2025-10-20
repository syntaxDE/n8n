import { ConfidentialClientApplication, AuthorizationUrlRequest, AuthorizationCodeRequest } from '@azure/msal-node';
import { logger } from '../../utils/logger';

interface MicrosoftTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresOn: Date;
}

export class MicrosoftAuthService {
  private msalClient: ConfidentialClientApplication;
  private redirectUri: string;

  constructor() {
    const clientId = process.env.MICROSOFT_CLIENT_ID!;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
    const tenantId = process.env.MICROSOFT_TENANT_ID!;
    this.redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:4000/api/auth/callback';

    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientSecret
      }
    });
  }

  /**
   * Generiert die Login-URL für Microsoft OAuth
   */
  getAuthUrl(state?: string): string {
    const authCodeUrlParameters: AuthorizationUrlRequest = {
      scopes: [
        'User.Read',
        'Mail.Read',
        'Mail.ReadWrite',
        'Mail.Send',
        'Calendars.ReadWrite',
        'offline_access' // Für Refresh Token
      ],
      redirectUri: this.redirectUri,
      state: state || ''
    };

    return this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
  }

  /**
   * Tauscht den Authorization Code gegen Access Token
   */
  async getTokenFromCode(code: string): Promise<MicrosoftTokenResponse> {
    try {
      const tokenRequest: AuthorizationCodeRequest = {
        code,
        scopes: [
          'User.Read',
          'Mail.Read',
          'Mail.ReadWrite',
          'Mail.Send',
          'Calendars.ReadWrite',
          'offline_access'
        ],
        redirectUri: this.redirectUri
      };

      const response = await this.msalClient.acquireTokenByCode(tokenRequest);

      if (!response) {
        throw new Error('No token response from Microsoft');
      }

      logger.info('Access token acquired', {
        expiresOn: response.expiresOn,
        account: response.account?.username
      });

      return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresOn: response.expiresOn!
      };

    } catch (error) {
      logger.error('Failed to acquire token', { error });
      throw error;
    }
  }

  /**
   * Erneuert den Access Token mit Refresh Token
   */
  async refreshAccessToken(refreshToken: string): Promise<MicrosoftTokenResponse> {
    try {
      const tokenRequest = {
        refreshToken,
        scopes: [
          'User.Read',
          'Mail.Read',
          'Mail.ReadWrite',
          'Mail.Send',
          'Calendars.ReadWrite'
        ]
      };

      const response = await this.msalClient.acquireTokenByRefreshToken(tokenRequest);

      if (!response) {
        throw new Error('Failed to refresh token');
      }

      logger.info('Token refreshed successfully');

      return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken || refreshToken, // Fallback auf alten Token
        expiresOn: response.expiresOn!
      };

    } catch (error) {
      logger.error('Failed to refresh token', { error });
      throw error;
    }
  }

  /**
   * Holt Benutzerinformationen vom Graph API
   */
  async getUserInfo(accessToken: string): Promise<{
    id: string;
    email: string;
    name: string;
  }> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const data = await response.json();

      return {
        id: data.id,
        email: data.mail || data.userPrincipalName,
        name: data.displayName
      };

    } catch (error) {
      logger.error('Failed to get user info', { error });
      throw error;
    }
  }
}
