/**
 * @author Composer
 * @description Friend service with Prisma database storage
 */

import { prisma } from "../../lib/prisma";
import type { Friend, FriendResponse, FriendTokenResponse } from "./model";
import { randomBytes } from "crypto";

export class FriendService {
  /**
   * Generate a unique friend request token for the user
   */
  async generateFriendToken(userId: string): Promise<FriendTokenResponse> {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Generate a unique token (32 bytes = 64 hex characters)
      const token = randomBytes(32).toString("hex");

      // Check if there's an existing non-expired token for this user
      const existingRequest = await prisma.friendRequest.findFirst({
        where: {
          requesterId: userId,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // If there's a valid existing token, return it
      if (existingRequest) {
        return {
          success: true,
          token: existingRequest.token,
        };
      }

      // Delete any existing friend requests for this user (expired or pending)
      // This prevents unique constraint violations when creating a new token
      await prisma.friendRequest.deleteMany({
        where: {
          requesterId: userId,
          requesteeId: userId, // Only delete placeholder requests (not yet scanned)
        },
      });

      // Create a new friend request token
      // The requester is the user generating the token (they want to be added as a friend)
      // The requestee will be set when someone scans the QR code
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      // Create friend request with requesterId = userId (the person sharing their QR)
      // requesteeId will be set to userId as placeholder, but when scanned,
      // the scanner's userId becomes the requesteeId
      const friendRequest = await prisma.friendRequest.create({
        data: {
          requesterId: userId, // The person who generated/shared the QR code
          requesteeId: userId, // Placeholder - will be the scanner's ID when they scan
          token,
          expiresAt,
        },
      });

      return {
        success: true,
        token: friendRequest.token,
      };
    } catch (error) {
      console.error("Error generating friend token:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to generate friend token",
      };
    }
  }

  /**
   * Add a friend by scanning their QR code token
   */
  async addFriendByToken(userId: string, token: string): Promise<FriendResponse> {
    try {
      // Find the friend request by token
      const friendRequest = await prisma.friendRequest.findUnique({
        where: { token },
        include: {
          requester: true,
        },
      });

      if (!friendRequest) {
        return {
          success: false,
          message: "Invalid or expired friend request token",
        };
      }

      // Check if token has expired
      if (friendRequest.expiresAt < new Date()) {
        return {
          success: false,
          message: "Friend request token has expired",
        };
      }

      const requesterId = friendRequest.requesterId;
      // The requester is the person who shared the QR code
      // The userId (scanner) wants to add the requester as a friend

      // Can't add yourself as a friend
      if (requesterId === userId) {
        return {
          success: false,
          message: "You cannot add yourself as a friend",
        };
      }

      // Check if they're already friends
      const existingFriendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1Id: userId, user2Id: requesterId },
            { user1Id: requesterId, user2Id: userId },
          ],
        },
      });

      if (existingFriendship) {
        return {
          success: false,
          message: "You are already friends with this user",
        };
      }

      // Create bidirectional friendship
      // Store with smaller ID first to avoid duplicates
      const [user1Id, user2Id] = userId < requesterId ? [userId, requesterId] : [requesterId, userId];

      const friendship = await prisma.friendship.create({
        data: {
          user1Id,
          user2Id,
        },
        include: {
          user1: true,
          user2: true,
        },
      });

      // Get the friend's details (the other user)
      const friendUser = friendship.user1Id === userId ? friendship.user2 : friendship.user1;

      const friend: Friend = {
        id: friendship.id,
        userId,
        friendId: friendUser.id,
        friendName: friendUser.name || "",
        friendEmail: friendUser.email,
        friendImage: friendUser.image,
        createdAt: friendship.createdAt,
      };

      // Delete the used friend request token
      await prisma.friendRequest.delete({
        where: { id: friendRequest.id },
      });

      return {
        success: true,
        friend,
      };
    } catch (error) {
      console.error("Error adding friend by token:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to add friend",
      };
    }
  }

  /**
   * Get all friends for a user
   */
  async getUserFriends(userId: string): Promise<FriendResponse> {
    try {
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
        include: {
          user1: true,
          user2: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const friends: Friend[] = friendships.map((friendship) => {
        const friendUser = friendship.user1Id === userId ? friendship.user2 : friendship.user1;
        return {
          id: friendship.id,
          userId,
          friendId: friendUser.id,
          friendName: friendUser.name || "",
          friendEmail: friendUser.email,
          friendImage: friendUser.image,
          createdAt: friendship.createdAt,
        };
      });

      return {
        success: true,
        friends,
      };
    } catch (error) {
      console.error("Error getting user friends:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to get friends",
      };
    }
  }

  /**
   * Remove a friend
   */
  async removeFriend(userId: string, friendId: string): Promise<FriendResponse> {
    try {
      // Find the friendship
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1Id: userId, user2Id: friendId },
            { user1Id: friendId, user2Id: userId },
          ],
        },
      });

      if (!friendship) {
        return {
          success: false,
          message: "Friendship not found",
        };
      }

      // Delete the friendship
      await prisma.friendship.delete({
        where: { id: friendship.id },
      });

      return {
        success: true,
        message: "Friend removed successfully",
      };
    } catch (error) {
      console.error("Error removing friend:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to remove friend",
      };
    }
  }
}

export const friendService = new FriendService();
