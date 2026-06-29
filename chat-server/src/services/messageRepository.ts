import { prisma } from "./db.js";

export type CreateMessageInput = {
  roomId: string;
  userId: string;
  userName: string;
  originalText: string;
  translatedText: string | null;
  sourceLang: string | null;
  targetLang: string | null;
  translationMs: number | null;
  translationStatus: "pending" | "completed" | "failed";
  translationError?: string | null;
};

export async function saveMessage(input: CreateMessageInput) {
  return prisma.message.create({
    data: {
      roomId: input.roomId,
      userId: input.userId,
      userName: input.userName,
      originalText: input.originalText,
      translatedText: input.translatedText,
      sourceLang: input.sourceLang,
      targetLang: input.targetLang,
      translationMs: input.translationMs,
      translationStatus: input.translationStatus,
      translationError: input.translationError ?? null
    }
  });
}

export async function updateMessageTranslation(
  messageId: string,
  input: {
    translatedText: string | null;
    sourceLang: string | null;
    targetLang: string | null;
    translationMs: number | null;
    translationStatus: "completed" | "failed";
    translationError?: string | null;
  }
) {
  return prisma.message.update({
    where: {
      id: messageId
    },
    data: {
      translatedText: input.translatedText,
      sourceLang: input.sourceLang,
      targetLang: input.targetLang,
      translationMs: input.translationMs,
      translationStatus: input.translationStatus,
      translationError: input.translationError ?? null
    }
  });
}

export async function getRoomMessages(roomId: string) {
  const messages = await prisma.message.findMany({
    where: {
      roomId
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 100
  });

  return messages.reverse();
}

export async function deleteRoomMessages(roomId: string) {
  return prisma.message.deleteMany({
    where: {
      roomId
    }
  });
}
