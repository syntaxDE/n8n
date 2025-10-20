import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { MicrosoftAuthService } from '../services/auth/MicrosoftAuthService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const authService = new MicrosoftAuthService();
const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * GET /api/auth/login
 * Initiiert den Microsoft OAuth Flow
 */
export async function login(req: Request, res: Response) {
  try {
    // State für CSRF Protection
    const state = jwt.sign({ timestamp: Date.now() }, JWT_SECRET, { expiresIn: '10m' });

    const authUrl = authService.getAuthUrl(state);

    // State im Cookie speichern zum Vergleich im Callback
    res.cookie('auth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000 // 10 Minuten
    });

    res.json({ authUrl });

  } catch (error) {
    logger.error('Login failed', { error });
    res.status(500).json({ error: 'Failed to initiate login' });
  }
}

/**
 * GET /api/auth/callback
 * Microsoft OAuth Callback - tauscht Code gegen Token
 */
export async function callback(req: Request, res: Response) {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // State validieren (CSRF Protection)
    const savedState = req.cookies.auth_state;
    if (!savedState || savedState !== state) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // Token vom Microsoft holen
    const { accessToken, refreshToken, expiresOn } = await authService.getTokenFromCode(code);

    // Benutzerinfo holen
    const userInfo = await authService.getUserInfo(accessToken);

    // Benutzer in DB speichern/updaten
    const user = await prisma.user.upsert({
      where: { microsoftId: userInfo.id },
      create: {
        email: userInfo.email,
        name: userInfo.name,
        microsoftId: userInfo.id,
        accessToken,
        refreshToken,
        tokenExpiry: expiresOn
      },
      update: {
        accessToken,
        refreshToken,
        tokenExpiry: expiresOn,
        name: userInfo.name
      }
    });

    // JWT für unsere App erstellen
    const appToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Cookie löschen
    res.clearCookie('auth_state');

    // Frontend-Redirect mit Token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${appToken}`);

  } catch (error) {
    logger.error('Callback failed', { error });
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * GET /api/auth/me
 * Gibt aktuellen User zurück
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    // User kommt aus authMiddleware
    const userId = (req as any).user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    logger.error('Get current user failed', { error });
    res.status(500).json({ error: 'Failed to get user info' });
  }
}

/**
 * POST /api/auth/refresh
 * Erneuert Microsoft Access Token
 */
export async function refreshToken(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user?.refreshToken) {
      return res.status(401).json({ error: 'No refresh token available' });
    }

    // Token erneuern
    const { accessToken, refreshToken: newRefreshToken, expiresOn } =
      await authService.refreshAccessToken(user.refreshToken);

    // In DB aktualisieren
    await prisma.user.update({
      where: { id: userId },
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        tokenExpiry: expiresOn
      }
    });

    res.json({ message: 'Token refreshed successfully' });

  } catch (error) {
    logger.error('Token refresh failed', { error });
    res.status(500).json({ error: 'Failed to refresh token' });
  }
}

/**
 * POST /api/auth/logout
 * Logout
 */
export async function logout(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;

    // Tokens aus DB löschen
    await prisma.user.update({
      where: { id: userId },
      data: {
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      }
    });

    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    logger.error('Logout failed', { error });
    res.status(500).json({ error: 'Logout failed' });
  }
}
