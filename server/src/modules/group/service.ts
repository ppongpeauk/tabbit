/**
 * @author Composer
 * @description Group service with business logic
 */

import { prisma } from "../../lib/prisma";
import type {
  CreateGroupDto,
  UpdateGroupDto,
  GroupResponse,
  GroupWithMembers,
  GroupReceiptResponse,
  GroupReceipt,
  GroupActivityResponse,
  GroupActivity,
  GroupBalanceResponse,
  GroupBalance,
} from "./model";
import { generateGroupCode } from "./model";

export class GroupService {
  /**
   * Get all groups for a user (groups they're a member of)
   */
  async getUserGroups(userId: string): Promise<GroupResponse> {
    try {
      const groups = await prisma.group.findMany({
        where: {
          members: {
            some: {
              userId,
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Transform to include creator in members if not already there
      const groupsWithMembers: GroupWithMembers[] = groups.map((group) => ({
        ...group,
        members: group.members.map((member) => ({
          id: member.id,
          userId: member.userId,
          role: member.role as "admin" | "member",
          joinedAt: member.joinedAt,
          user: member.user,
        })),
      }));

      return {
        success: true,
        groups: groupsWithMembers,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch groups",
      };
    }
  }

  /**
   * Get a group by ID (only if user is a member)
   */
  async getGroupById(groupId: string, userId: string): Promise<GroupResponse> {
    try {
      const group = await prisma.group.findFirst({
        where: {
          id: groupId,
          members: {
            some: {
              userId,
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      if (!group) {
        return {
          success: false,
          message: "Group not found or you are not a member",
        };
      }

      const groupWithMembers: GroupWithMembers = {
        ...group,
        members: group.members.map((member) => ({
          id: member.id,
          userId: member.userId,
          role: member.role as "admin" | "member",
          joinedAt: member.joinedAt,
          user: member.user,
        })),
      };

      return {
        success: true,
        group: groupWithMembers,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch group",
      };
    }
  }

  /**
   * Create a new group
   */
  async createGroup(
    userId: string,
    data: CreateGroupDto
  ): Promise<GroupResponse> {
    try {
      // Generate unique code
      let code = generateGroupCode();
      let codeExists = true;
      let attempts = 0;
      const maxAttempts = 10;

      // Ensure code is unique
      while (codeExists && attempts < maxAttempts) {
        const existing = await prisma.group.findUnique({
          where: { code },
        });
        if (!existing) {
          codeExists = false;
        } else {
          code = generateGroupCode();
          attempts++;
        }
      }

      if (codeExists) {
        return {
          success: false,
          message: "Failed to generate unique group code",
        };
      }

      // Create group with creator as admin member
      const group = await prisma.group.create({
        data: {
          name: data.name,
          description: data.description || null,
          code,
          creatorId: userId,
          members: {
            create: {
              userId,
              role: "admin",
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      const groupWithMembers: GroupWithMembers = {
        ...group,
        members: group.members.map((member) => ({
          id: member.id,
          userId: member.userId,
          role: member.role as "admin" | "member",
          joinedAt: member.joinedAt,
          user: member.user,
        })),
      };

      return {
        success: true,
        group: groupWithMembers,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to create group",
      };
    }
  }

  /**
   * Update a group (only if user is admin)
   */
  async updateGroup(
    groupId: string,
    userId: string,
    data: UpdateGroupDto
  ): Promise<GroupResponse> {
    try {
      // Check if user is admin
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!member || member.role !== "admin") {
        return {
          success: false,
          message: "Only admins can update the group",
        };
      }

      const group = await prisma.group.update({
        where: { id: groupId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && {
            description: data.description || null,
          }),
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      const groupWithMembers: GroupWithMembers = {
        ...group,
        members: group.members.map((member) => ({
          id: member.id,
          userId: member.userId,
          role: member.role as "admin" | "member",
          joinedAt: member.joinedAt,
          user: member.user,
        })),
      };

      return {
        success: true,
        group: groupWithMembers,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update group",
      };
    }
  }

  /**
   * Join a group by code
   */
  async joinGroup(userId: string, code: string): Promise<GroupResponse> {
    try {
      // Normalize code
      const normalizedCode = code.replace(/\s/g, "").toUpperCase();

      // Find group by code
      const group = await prisma.group.findUnique({
        where: { code: normalizedCode },
        include: {
          members: true,
        },
      });

      if (!group) {
        return {
          success: false,
          message: "Invalid group code",
        };
      }

      // Check if already a member
      const existingMember = group.members.find((m) => m.userId === userId);
      if (existingMember) {
        return {
          success: false,
          message: "You are already a member of this group",
        };
      }

      // Add user as member
      await prisma.groupMember.create({
        data: {
          groupId: group.id,
          userId,
          role: "member",
        },
      });

      // Fetch updated group with all members
      const updatedGroup = await prisma.group.findUnique({
        where: { id: group.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      if (!updatedGroup) {
        return {
          success: false,
          message: "Failed to fetch updated group",
        };
      }

      const groupWithMembers: GroupWithMembers = {
        ...updatedGroup,
        members: updatedGroup.members.map((member) => ({
          id: member.id,
          userId: member.userId,
          role: member.role as "admin" | "member",
          joinedAt: member.joinedAt,
          user: member.user,
        })),
      };

      return {
        success: true,
        group: groupWithMembers,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to join group",
      };
    }
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId: string, userId: string): Promise<GroupResponse> {
    try {
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
        include: {
          group: true,
        },
      });

      if (!member) {
        return {
          success: false,
          message: "You are not a member of this group",
        };
      }

      // Don't allow creator/admin to leave if they're the only admin
      if (member.role === "admin") {
        const adminCount = await prisma.groupMember.count({
          where: {
            groupId,
            role: "admin",
          },
        });

        if (adminCount === 1) {
          return {
            success: false,
            message:
              "Cannot leave group: you are the only admin. Transfer ownership or delete the group instead.",
          };
        }
      }

      await prisma.groupMember.delete({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      return {
        success: true,
        message: "Successfully left the group",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to leave group",
      };
    }
  }

  /**
   * Delete a group (only if user is creator/admin)
   */
  async deleteGroup(groupId: string, userId: string): Promise<GroupResponse> {
    try {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        return {
          success: false,
          message: "Group not found",
        };
      }

      // Check if user is creator or admin
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!member || (member.role !== "admin" && group.creatorId !== userId)) {
        return {
          success: false,
          message: "Only admins can delete the group",
        };
      }

      await prisma.group.delete({
        where: { id: groupId },
      });

      return {
        success: true,
        message: "Group deleted successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to delete group",
      };
    }
  }

  /**
   * Update group icon key
   */
  async updateGroupIcon(
    groupId: string,
    userId: string,
    iconKey: string
  ): Promise<GroupResponse> {
    try {
      // Check if user is admin
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!member || member.role !== "admin") {
        return {
          success: false,
          message: "Only admins can update the group icon",
        };
      }

      const group = await prisma.group.update({
        where: { id: groupId },
        data: { iconKey },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      const groupWithMembers: GroupWithMembers = {
        ...group,
        members: group.members.map((member) => ({
          id: member.id,
          userId: member.userId,
          role: member.role as "admin" | "member",
          joinedAt: member.joinedAt,
          user: member.user,
        })),
      };

      return {
        success: true,
        group: groupWithMembers,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update icon",
      };
    }
  }

  /**
   * Share a receipt with a group
   */
  async shareReceiptWithGroup(
    groupId: string,
    receiptId: string,
    userId: string
  ): Promise<GroupReceiptResponse> {
    try {
      // Verify user is a member of the group
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!member) {
        return {
          success: false,
          message: "You must be a member of this group to share receipts",
        };
      }

      // Verify user has access to the receipt
      const receipt = await prisma.receipt.findFirst({
        where: {
          id: receiptId,
          OR: [{ userId }, { sharedWith: { some: { userId } } }],
        },
      });

      if (!receipt) {
        return {
          success: false,
          message: "Receipt not found or you don't have access to it",
        };
      }

      // Check if already shared
      const existing = await prisma.groupReceipt.findUnique({
        where: {
          groupId_receiptId: {
            groupId,
            receiptId,
          },
        },
      });

      if (existing) {
        return {
          success: false,
          message: "Receipt is already shared with this group",
        };
      }

      // Create GroupReceipt
      const groupReceipt = await prisma.groupReceipt.create({
        data: {
          groupId,
          receiptId,
          sharedBy: userId,
        },
        include: {
          receipt: true,
          sharer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      return {
        success: true,
        receipts: [
          {
            id: groupReceipt.id,
            groupId: groupReceipt.groupId,
            receiptId: groupReceipt.receiptId,
            sharedBy: groupReceipt.sharedBy,
            sharedAt: groupReceipt.sharedAt,
            receipt: groupReceipt.receipt,
            sharer: groupReceipt.sharer,
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to share receipt with group",
      };
    }
  }

  /**
   * Get all receipts shared with a group
   */
  async getGroupReceipts(
    groupId: string,
    userId: string
  ): Promise<GroupReceiptResponse> {
    try {
      // Verify user is a member
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!member) {
        return {
          success: false,
          message: "You must be a member of this group to view receipts",
        };
      }

      const groupReceipts = await prisma.groupReceipt.findMany({
        where: { groupId },
        include: {
          receipt: true,
          sharer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { sharedAt: "desc" },
      });

      const receipts: GroupReceipt[] = groupReceipts.map((gr) => ({
        id: gr.id,
        groupId: gr.groupId,
        receiptId: gr.receiptId,
        sharedBy: gr.sharedBy,
        sharedAt: gr.sharedAt,
        receipt: gr.receipt,
        sharer: gr.sharer,
      }));

      return {
        success: true,
        receipts,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch group receipts",
      };
    }
  }

  /**
   * Remove a receipt from a group (admin only)
   */
  async removeReceiptFromGroup(
    groupId: string,
    receiptId: string,
    userId: string
  ): Promise<GroupReceiptResponse> {
    try {
      // Check if user is admin
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!member || member.role !== "admin") {
        return {
          success: false,
          message: "Only admins can remove receipts from the group",
        };
      }

      await prisma.groupReceipt.delete({
        where: {
          groupId_receiptId: {
            groupId,
            receiptId,
          },
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to remove receipt from group",
      };
    }
  }

  /**
   * Update member role (admin only)
   */
  async updateMemberRole(
    groupId: string,
    memberId: string,
    role: "admin" | "member",
    requesterId: string
  ): Promise<GroupResponse> {
    try {
      // Check if requester is admin
      const requesterMember = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: requesterId,
          },
        },
      });

      if (!requesterMember || requesterMember.role !== "admin") {
        return {
          success: false,
          message: "Only admins can change member roles",
        };
      }

      // Get target member and group
      const targetMember = await prisma.groupMember.findUnique({
        where: { id: memberId },
        include: { group: true },
      });

      if (!targetMember || targetMember.groupId !== groupId) {
        return {
          success: false,
          message: "Member not found in this group",
        };
      }

      // Prevent changing creator's role
      if (targetMember.group.creatorId === targetMember.userId) {
        return {
          success: false,
          message: "Cannot change the role of the group creator",
        };
      }

      // Update role
      await prisma.groupMember.update({
        where: { id: memberId },
        data: { role },
      });

      // Fetch updated group
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      if (!group) {
        return {
          success: false,
          message: "Failed to fetch updated group",
        };
      }

      const groupWithMembers: GroupWithMembers = {
        ...group,
        members: group.members.map((member) => ({
          id: member.id,
          userId: member.userId,
          role: member.role as "admin" | "member",
          joinedAt: member.joinedAt,
          user: member.user,
        })),
      };

      return {
        success: true,
        group: groupWithMembers,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update member role",
      };
    }
  }

  /**
   * Remove a member from the group (admin only)
   */
  async removeMember(
    groupId: string,
    memberId: string,
    requesterId: string
  ): Promise<GroupResponse> {
    try {
      // Check if requester is admin
      const requesterMember = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: requesterId,
          },
        },
      });

      if (!requesterMember || requesterMember.role !== "admin") {
        return {
          success: false,
          message: "Only admins can remove members",
        };
      }

      // Get target member and group
      const targetMember = await prisma.groupMember.findUnique({
        where: { id: memberId },
        include: { group: true },
      });

      if (!targetMember || targetMember.groupId !== groupId) {
        return {
          success: false,
          message: "Member not found in this group",
        };
      }

      // Prevent removing creator
      if (targetMember.group.creatorId === targetMember.userId) {
        return {
          success: false,
          message: "Cannot remove the group creator",
        };
      }

      // Check if target is admin and would be the last admin
      if (targetMember.role === "admin") {
        const adminCount = await prisma.groupMember.count({
          where: {
            groupId,
            role: "admin",
          },
        });

        if (adminCount === 1) {
          return {
            success: false,
            message:
              "Cannot remove the only admin. Promote another member first.",
          };
        }
      }

      await prisma.groupMember.delete({
        where: { id: memberId },
      });

      return {
        success: true,
        message: "Member removed successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to remove member",
      };
    }
  }

  /**
   * Get group activity feed
   */
  async getGroupActivity(
    groupId: string,
    userId: string
  ): Promise<GroupActivityResponse> {
    try {
      // Verify user is a member
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!member) {
        return {
          success: false,
          message: "You must be a member of this group to view activity",
        };
      }

      const activities: GroupActivity[] = [];

      // Get receipts added to group
      const receipts = await prisma.groupReceipt.findMany({
        where: { groupId },
        include: {
          sharer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { sharedAt: "desc" },
        take: 50,
      });

      receipts.forEach((r) => {
        const receiptData = r.receipt.data as any;
        const merchant = receiptData?.merchant?.name || "Unknown";
        const totals = receiptData?.totals;
        const amount = totals?.total || 0;
        const currency = totals?.currency || "USD";

        activities.push({
          id: `receipt-${r.id}`,
          type: "receipt_added",
          userId: r.sharedBy,
          userName: r.sharer.name || r.sharer.email.split("@")[0],
          action: "added a receipt",
          detail: `${merchant} - ${currency}${amount.toFixed(2)}`,
          createdAt: r.sharedAt,
          emoji: "🧾",
        });
      });

      // Get members who joined
      const members = await prisma.groupMember.findMany({
        where: { groupId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      });

      members.forEach((m) => {
        const userName = m.user.name || m.user.email.split("@")[0];
        activities.push({
          id: `member-${m.id}`,
          type: "member_joined",
          userId: m.userId,
          userName,
          action: "joined the group",
          detail: "",
          createdAt: m.joinedAt,
          emoji: "👋",
        });
      });

      // Sort by date desc
      activities.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      return {
        success: true,
        activities: activities.slice(0, 50),
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch group activity",
      };
    }
  }

  /**
   * Calculate member balances
   */
  async getGroupBalances(
    groupId: string,
    userId: string
  ): Promise<GroupBalanceResponse> {
    try {
      // Verify user is a member
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

      if (!member) {
        return {
          success: false,
          message: "You must be a member of this group to view balances",
        };
      }

      // Get all group members
      const members = await prisma.groupMember.findMany({
        where: { groupId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      // Get group receipts with split data
      const groupReceipts = await prisma.groupReceipt.findMany({
        where: { groupId },
        include: {
          receipt: true,
        },
      });

      // Calculate balances
      const balances: Map<string, GroupBalance> = new Map();

      members.forEach((m) => {
        const userName = m.user.name || m.user.email.split("@")[0];
        balances.set(m.userId, {
          userId: m.userId,
          userName,
          userImage: m.user.image,
          amount: 0,
          currency: "USD",
          status: "settled",
        });
      });

      groupReceipts.forEach((gr) => {
        const receiptData = gr.receipt.data as any;
        const totals = receiptData?.totals;
        const total = totals?.total || 0;
        const currency = totals?.currency || "USD";

        // Find split data if exists
        const appData = receiptData?.appData;
        const splitData = appData?.splitData;

        if (splitData && Array.isArray(splitData)) {
          // Parse split data
          splitData.forEach((split: any) => {
            const currentBalance = balances.get(split.userId);
            if (currentBalance) {
              currentBalance.amount += split.amount || 0;
            }
          });
        }
      });

      // Determine status
      balances.forEach((balance) => {
        if (Math.abs(balance.amount) < 0.01) {
          balance.status = "settled";
        } else if (balance.amount > 0) {
          balance.status = "owed";
        } else {
          balance.status = "owes";
        }
      });

      return {
        success: true,
        balances: Array.from(balances.values()),
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch group balances",
      };
    }
  }
}

export const groupService = new GroupService();

