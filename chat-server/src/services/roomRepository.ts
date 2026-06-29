import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "./db.js";

export type RoomSummary = {
  id: string;
  name: string | null;
  inviteToken: string;
  createdAt: Date;
  updatedAt: Date;
};

export type GuestUser = {
  id: string;
  displayName: string;
};

function createInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createRoom(name?: string): Promise<RoomSummary> {
  return prisma.room.create({
    data: {
      id: randomUUID(),
      name: name?.trim() || null,
      inviteToken: createInviteToken()
    }
  });
}

export async function getRoomById(roomId: string): Promise<RoomSummary | null> {
  return prisma.room.findUnique({
    where: {
      id: roomId
    }
  });
}

export async function getRoomByInviteToken(
  inviteToken: string
): Promise<RoomSummary | null> {
  return prisma.room.findUnique({
    where: {
      inviteToken
    }
  });
}

export async function createOrGetGuestUser(
  displayName: string
): Promise<GuestUser> {
  return prisma.user.upsert({
    where: {
      displayName
    },
    update: {},
    create: {
      displayName
    },
    select: {
      id: true,
      displayName: true
    }
  });
}
