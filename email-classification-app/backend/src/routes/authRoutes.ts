import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

/**
 * @route   GET /api/auth/login
 * @desc    Initiiert Microsoft OAuth Login
 * @access  Public
 */
router.get('/login', authController.login);

/**
 * @route   GET /api/auth/callback
 * @desc    Microsoft OAuth Callback
 * @access  Public
 */
router.get('/callback', authController.callback);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authenticateToken, authController.getCurrentUser);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh Microsoft Access Token
 * @access  Private
 */
router.post('/refresh', authenticateToken, authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, authController.logout);

export default router;
