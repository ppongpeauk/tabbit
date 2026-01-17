/**
 * @author Composer
 * @description Friend relationship models and schemas
 */

import { t } from "elysia";

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  friendName: string;
  friendEmail: string;
  friendImage: string | null;
  createdAt: Date;
}

export interface FriendRequest {
  id: string;
  requesterId: string;
  requesteeId: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface FriendResponse {
  success: boolean;
  message?: string;
  friend?: Friend;
  friends?: Friend[];
  token?: string;
}

export interface FriendTokenResponse {
  success: boolean;
  message?: string;
  token?: string;
  qrCode?: string; // URL or data for QR code
}

export const generateFriendTokenSchema = t.Object({
  // No body needed, token is generated server-side
});

export const addFriendByTokenSchema = t.Object({
  token: t.String({ minLength: 1 }),
});
