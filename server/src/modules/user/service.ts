/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description User service with Prisma database storage
 */

import type { CreateUserDto, UpdateUserDto, User, UserResponse } from "./model";
import { cacheService } from "../../utils/cache";
import { prisma } from "../../lib/prisma";

const CACHE_TTL = 3600; // 1 hour
const CACHE_KEYS = {
  user: (id: string) => `user:${id}`,
  allUsers: "users:all",
};

/**
 * Serialized user type for caching (dates as ISO strings)
 */
type SerializedUser = Omit<User, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

/**
 * Serialize User for caching (convert Date to ISO string)
 */
function serializeUser(user: User): SerializedUser {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/**
 * Deserialize User from cache (convert ISO string to Date)
 */
function deserializeUser(user: SerializedUser): User {
  return {
    ...user,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

export class UserService {
  /**
   * Get all users
   */
  async getAllUsers(): Promise<UserResponse> {
    // Try to get from cache
    const cached = await cacheService.get<SerializedUser[]>(
      CACHE_KEYS.allUsers
    );
    if (cached) {
      return {
        success: true,
        users: cached.map(deserializeUser),
      };
    }

    // Cache miss, get from database
    const dbUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    const users: User[] = dbUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name || "",
      image: u.image || null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    const result = {
      success: true,
      users,
    };

    // Cache the result (serialize dates)
    await cacheService.set(
      CACHE_KEYS.allUsers,
      users.map(serializeUser),
      CACHE_TTL
    );

    return result;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserResponse> {
    // Try to get from cache
    const cached = await cacheService.get<SerializedUser>(CACHE_KEYS.user(id));
    if (cached) {
      return {
        success: true,
        user: deserializeUser(cached),
      };
    }

    // Cache miss, get from database
    const dbUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!dbUser) {
      return {
        success: false,
        message: "User not found",
      };
    }

    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || "",
      image: dbUser.image || null,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };

    // Cache the result (serialize dates)
    await cacheService.set(CACHE_KEYS.user(id), serializeUser(user), CACHE_TTL);

    return {
      success: true,
      user,
    };
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserDto): Promise<UserResponse> {
    const dbUser = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        image: null,
      },
    });

    const newUser: User = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || "",
      image: dbUser.image || null,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };

    // Invalidate cache
    await cacheService.delete(CACHE_KEYS.allUsers);
    // Cache the new user (serialize dates)
    await cacheService.set(
      CACHE_KEYS.user(newUser.id),
      serializeUser(newUser),
      CACHE_TTL
    );

    return {
      success: true,
      user: newUser,
    };
  }

  /**
   * Update user by ID
   */
  async updateUser(id: string, data: UpdateUserDto): Promise<UserResponse> {
    const dbUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!dbUser) {
      return {
        success: false,
        message: "User not found",
      };
    }

    const updatedDbUser = await prisma.user.update({
      where: { id },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.image !== undefined && { image: data.image }),
      },
    });

    const updatedUser: User = {
      id: updatedDbUser.id,
      email: updatedDbUser.email,
      name: updatedDbUser.name || "",
      image: updatedDbUser.image || null,
      createdAt: updatedDbUser.createdAt,
      updatedAt: updatedDbUser.updatedAt,
    };

    // Invalidate cache
    await cacheService.delete(CACHE_KEYS.user(id));
    await cacheService.delete(CACHE_KEYS.allUsers);
    // Cache the updated user (serialize dates)
    await cacheService.set(
      CACHE_KEYS.user(id),
      serializeUser(updatedUser),
      CACHE_TTL
    );

    return {
      success: true,
      user: updatedUser,
    };
  }

  /**
   * Delete user by ID
   */
  async deleteUser(id: string): Promise<UserResponse> {
    const dbUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!dbUser) {
      return {
        success: false,
        message: "User not found",
      };
    }

    await prisma.user.delete({
      where: { id },
    });

    // Invalidate cache
    await cacheService.delete(CACHE_KEYS.user(id));
    await cacheService.delete(CACHE_KEYS.allUsers);

    return {
      success: true,
      message: "User deleted successfully",
    };
  }
}

export const userService = new UserService();
