import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { SessionModel } from '../models/SessionModel';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  hashTokenForStorage,
  type JwtUserPayload,
} from '../utils/crypto';

export type SessionListItem = {
  id: string;
  userId: string;
  createdAt: string;
  lastActive: string;
  userAgent?: string;
  ip?: string;
};

export class SessionService {
  /**
   * Create a DB session row and return access + refresh tokens bound to that session.
   */
  static async issueTokensForNewSession(
    payload: Omit<JwtUserPayload, 'sessionId'>,
    meta: { userAgent?: string; ip?: string }
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const sessionId = new mongoose.Types.ObjectId();
    const sid = sessionId.toString();
    const full: JwtUserPayload = { ...payload, sessionId: sid };
    const refreshToken = generateRefreshToken(full);
    const accessToken = generateAccessToken(full);
    const decoded = jwt.decode(refreshToken) as { exp?: number };
    const expSec = decoded?.exp ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

    await SessionModel.create({
      _id: sessionId,
      user_id: new mongoose.Types.ObjectId(payload.userId),
      token_hash: hashTokenForStorage(refreshToken),
      user_agent: meta.userAgent,
      ip: meta.ip,
      expires_at: new Date(expSec * 1000),
      last_active_at: new Date(),
    });

    return { accessToken, refreshToken, sessionId: sid };
  }

  static async refreshTokens(
    refreshToken: string
  ): Promise<
    { success: true; accessToken: string; refreshToken: string } | { success: false; error: string }
  > {
    const v = verifyToken(refreshToken, 'refresh');
    if (!v.valid || !v.payload?.sessionId || !v.payload?.userId) {
      return { success: false, error: 'Invalid or expired refresh token' };
    }

    const session = await SessionModel.findById(v.payload.sessionId).exec();
    if (!session || session.revoked_at) {
      return { success: false, error: 'Session not found or revoked' };
    }
    if (session.user_id.toString() !== v.payload.userId) {
      return { success: false, error: 'Invalid session' };
    }
    if (session.expires_at < new Date()) {
      await SessionModel.updateOne({ _id: session._id }, { $set: { revoked_at: new Date() } });
      return { success: false, error: 'Session expired' };
    }

    const incomingHash = hashTokenForStorage(refreshToken);
    if (session.token_hash !== incomingHash) {
      await SessionModel.updateOne({ _id: session._id }, { $set: { revoked_at: new Date() } });
      return { success: false, error: 'Invalid refresh token' };
    }

    const full: JwtUserPayload = {
      userId: v.payload.userId,
      email: v.payload.email,
      userType: v.payload.userType,
      userMerchantId: v.payload.userMerchantId,
      sessionId: v.payload.sessionId,
    };
    const newRefresh = generateRefreshToken(full);
    const newAccess = generateAccessToken(full);
    const decoded = jwt.decode(newRefresh) as { exp?: number };
    const expSec = decoded?.exp ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

    session.token_hash = hashTokenForStorage(newRefresh);
    session.expires_at = new Date(expSec * 1000);
    session.last_active_at = new Date();
    await session.save();

    return { success: true, accessToken: newAccess, refreshToken: newRefresh };
  }

  /** Revoke a session if it belongs to the user. */
  static async revokeBySessionId(userId: string, sessionId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(sessionId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return false;
    }
    const res = await SessionModel.updateOne(
      {
        _id: new mongoose.Types.ObjectId(sessionId),
        user_id: new mongoose.Types.ObjectId(userId),
        revoked_at: null,
      },
      { $set: { revoked_at: new Date() } }
    ).exec();
    return res.modifiedCount > 0;
  }

  /**
   * Revoke using a refresh token (e.g. logout when access token is expired).
   */
  static async revokeWithRefreshToken(
    refreshToken: string
  ): Promise<{ success: boolean; error?: string }> {
    const v = verifyToken(refreshToken, 'refresh');
    if (!v.valid || !v.payload?.sessionId || !v.payload?.userId) {
      return { success: false, error: 'Invalid or expired refresh token' };
    }

    const session = await SessionModel.findById(v.payload.sessionId).exec();
    if (!session || session.revoked_at) {
      return { success: true };
    }
    if (session.user_id.toString() !== v.payload.userId) {
      return { success: false, error: 'Invalid session' };
    }
    if (session.token_hash !== hashTokenForStorage(refreshToken)) {
      return { success: false, error: 'Invalid refresh token' };
    }

    await SessionModel.updateOne({ _id: session._id }, { $set: { revoked_at: new Date() } });
    return { success: true };
  }

  /** Invalidate every active session for a user (e.g. after password change). */
  static async revokeAllForUser(userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return;
    await SessionModel.updateMany(
      { user_id: new mongoose.Types.ObjectId(userId), revoked_at: null },
      { $set: { revoked_at: new Date() } }
    ).exec();
  }

  static async listActiveSessions(userId: string): Promise<SessionListItem[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];
    const docs = await SessionModel.find({
      user_id: new mongoose.Types.ObjectId(userId),
      revoked_at: null,
      expires_at: { $gt: new Date() },
    })
      .sort({ last_active_at: -1 })
      .lean()
      .exec();

    return docs.map((d) => ({
      id: (d._id as mongoose.Types.ObjectId).toString(),
      userId,
      createdAt: (d.created_at as Date).toISOString(),
      lastActive: (d.last_active_at as Date).toISOString(),
      userAgent: d.user_agent,
      ip: d.ip,
    }));
  }
}
