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

// Group Receipt interfaces
export interface GroupReceipt {
  id: string;
  groupId: string;
  receiptId: string;
  sharedBy: string;
  sharedAt: Date;
  receipt: {
    id: string;
    userId: string;
    data: any;
    createdAt: Date;
    updatedAt: Date;
    syncedAt: Date | null;
  };
  sharer: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface GroupReceiptResponse {
  success: boolean;
  message?: string;
  receipts?: GroupReceipt[];
}

export interface GroupActivity {
  id: string;
  type: "receipt_added" | "member_joined" | "member_role_changed" | "group_updated";
  userId: string;
  userName: string;
  action: string;
  detail: string;
  createdAt: Date;
  emoji: string;
}

export interface GroupActivityResponse {
  success: boolean;
  message?: string;
  activities?: GroupActivity[];
}

export interface GroupBalance {
  userId: string;
  userName: string;
  userImage: string | null;
  amount: number;
  currency: string;
  status: "owed" | "owes" | "settled";
}

export interface GroupBalanceResponse {
  success: boolean;
  message?: string;
  balances?: GroupBalance[];
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

