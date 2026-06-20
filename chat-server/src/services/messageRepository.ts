import { prisma } from "./db.js";

export type CreateMessageInput = {
  roomId: string;
  userName: string;
  originalText: string;
  translatedText: string | null;
  sourceLang: string | null;
  targetLang: string | null;
  translationMs: number | null;
};

export async function saveMessage(input: CreateMessageInput) {
  return prisma.message.create({
    data: {
      roomId: input.roomId,
      userName: input.userName,
      originalText: input.originalText,
      translatedText: input.translatedText,
      sourceLang: input.sourceLang,
      targetLang: input.targetLang,
      translationMs: input.translationMs
    }
  });
}

export async function getRoomMessages(roomId: string) {
  return prisma.message.findMany({
    where: {
      roomId
    },
    orderBy: {
      createdAt: "asc"
    },
    take: 100
  });
}

export async function deleteRoomMessages(roomId: string) {
  return prisma.message.deleteMany({
    where: {
      roomId
    }
  });
}