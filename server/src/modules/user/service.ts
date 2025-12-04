/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description User service with in-memory storage (TODO: migrate to Prisma)
 */

import type { CreateUserDto, UpdateUserDto, User, UserResponse } from "./model";
import { cacheService } from "../../utils/cache";

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
  private users: User[] = [
    {
      id: "1",
      email: "test@example.com",
      name: "Test User",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

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

    // Cache miss, get from source
    const result = {
      success: true,
      users: this.users,
    };

    // Cache the result (serialize dates)
    await cacheService.set(
      CACHE_KEYS.allUsers,
      this.users.map(serializeUser),
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

    // Cache miss, get from source
    const user = this.users.find((u) => u.id === id);

    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

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
    const newUser: User = {
      id: String(this.users.length + 1),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(newUser);

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
    const userIndex = this.users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return {
        success: false,
        message: "User not found",
      };
    }

    const updatedUser: User = {
      ...this.users[userIndex],
      ...data,
      updatedAt: new Date(),
    };

    this.users[userIndex] = updatedUser;

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
    const userIndex = this.users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return {
        success: false,
        message: "User not found",
      };
    }

    this.users.splice(userIndex, 1);

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
