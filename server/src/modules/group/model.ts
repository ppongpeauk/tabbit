/**
 * @author Composer
 * @description Group data models and validation schemas
 */

import { t } from "elysia";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  iconKey: string | null;
  code: string;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: "admin" | "member";
  joinedAt: Date;
}

export interface GroupWithMembers extends Group {
  members: Array<{
    id: string;
    userId: string;
    role: "admin" | "member";
    joinedAt: Date;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }>;
}

export interface CreateGroupDto {
  name: string;
  description?: string;
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
}

export interface JoinGroupDto {
  code: string;
}

export interface GroupResponse {
  success: boolean;
  message?: string;
  group?: GroupWithMembers;
  groups?: GroupWithMembers[];
}

/**
 * Generate a unique group code
 */
export function generateGroupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Validation schemas
export const createGroupSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 50 }),
  description: t.Optional(t.String({ maxLength: 200 })),
});

export const updateGroupSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
  description: t.Optional(t.String({ maxLength: 200 })),
});

export const joinGroupSchema = t.Object({
  code: t.String({ minLength: 4, maxLength: 20 }),
});

