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
}

export const groupService = new GroupService();

