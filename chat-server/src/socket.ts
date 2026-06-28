import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import {
  detectTargetLang,
  translateMessage,
  type SourceLang,
  type TargetLang
} from "./services/translation.js";
import {
  getRoomMessages,
  saveMessage
} from "./services/messageRepository.js";

type TranslationDirection = "auto" | "en-ja" | "ja-en";

type ValidatedMessagePayload = {
  roomId: string;
  userName: string;
  text: string;
  sourceLang: SourceLang;
  targetLang: TargetLang;
  clientMessageId?: string;
};

type ChatMessage = {
  id: string;
  roomId: string;
  userName: string;
  originalText: string;
  translatedText: string | null;
  sourceLang: string | null;
  targetLang: string | null;
  translationMs: number | null;
  cacheHit?: boolean;
  clientMessageId?: string;
  createdAt: string;
};

type ValidationResult =
  | {
      ok: true;
      value: ValidatedMessagePayload;
    }
  | {
      ok: false;
      error: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSourceLang(value: unknown): value is SourceLang {
  return value === "auto" || value === "ja" || value === "en";
}

function isTargetLang(value: unknown): value is TargetLang {
  return value === "ja" || value === "en";
}

function isTranslationDirection(value: unknown): value is TranslationDirection {
  return value === "auto" || value === "en-ja" || value === "ja-en";
}

function validateRoomId(roomId: string): string | null {
  if (roomId.length === 0) return "Room ID is required.";
  if (roomId.length > 50) return "Room ID must be 50 characters or less.";
  if (!/^[a-zA-Z0-9_-]+$/.test(roomId)) {
    return "Room ID can only contain letters, numbers, hyphens, and underscores.";
  }

  return null;
}

function validateUserName(userName: string): string | null {
  if (userName.length === 0) return "User name is required.";
  if (userName.length > 30) return "User name must be 30 characters or less.";

  return null;
}

function validateText(text: string): string | null {
  if (text.length === 0) return "Message is required.";
  if (text.length > 1000) return "Message must be 1000 characters or less.";

  return null;
}

function resolveLanguages(
  data: Record<string, unknown>,
  text: string
): { sourceLang: SourceLang; targetLang: TargetLang } | { error: string } {
  const direction = data.translationDirection ?? "auto";

  if (!isTranslationDirection(direction)) {
    return { error: "Invalid translation direction." };
  }

  if (direction === "en-ja") {
    return { sourceLang: "en", targetLang: "ja" };
  }

  if (direction === "ja-en") {
    return { sourceLang: "ja", targetLang: "en" };
  }

  const sourceLang = data.sourceLang ?? "auto";
  const targetLang = data.targetLang ?? detectTargetLang(text);

  if (!isSourceLang(sourceLang)) {
    return { error: "Invalid source language." };
  }

  if (!isTargetLang(targetLang)) {
    return { error: "Invalid target language." };
  }

  if (sourceLang !== "auto" && sourceLang === targetLang) {
    return { error: "Source language and target language must be different." };
  }

  return { sourceLang, targetLang };
}

function validateMessagePayload(payload: unknown): ValidationResult {
  if (!isRecord(payload)) {
    return { ok: false, error: "Invalid message payload." };
  }

  const roomId = typeof payload.roomId === "string" ? payload.roomId.trim() : "";
  const userName =
    typeof payload.userName === "string" ? payload.userName.trim() : "";
  const text = typeof payload.text === "string" ? payload.text.trim() : "";

  const roomError = validateRoomId(roomId);
  if (roomError) return { ok: false, error: roomError };

  const userNameError = validateUserName(userName);
  if (userNameError) return { ok: false, error: userNameError };

  const textError = validateText(text);
  if (textError) return { ok: false, error: textError };

  const languageResult = resolveLanguages(payload, text);
  if ("error" in languageResult) {
    return { ok: false, error: languageResult.error };
  }

  const clientMessageId =
    typeof payload.clientMessageId === "string" &&
    payload.clientMessageId.trim().length > 0
      ? payload.clientMessageId.trim()
      : undefined;

  return {
    ok: true,
    value: {
      roomId,
      userName,
      text,
      sourceLang: languageResult.sourceLang,
      targetLang: languageResult.targetLang,
      clientMessageId
    }
  };
}

function toChatMessage(
  message: {
    id: string;
    roomId: string;
    userName: string;
    originalText: string;
    translatedText: string | null;
    sourceLang: string | null;
    targetLang: string | null;
    translationMs: number | null;
    createdAt: Date;
  },
  clientMessageId?: string
): ChatMessage {
  const chatMessage: ChatMessage = {
    id: message.id,
    roomId: message.roomId,
    userName: message.userName,
    originalText: message.originalText,
    translatedText: message.translatedText,
    sourceLang: message.sourceLang,
    targetLang: message.targetLang,
    translationMs: message.translationMs,
    createdAt: message.createdAt.toISOString()
  };

  if (clientMessageId) {
    chatMessage.clientMessageId = clientMessageId;
  }

  return chatMessage;
}

function emitMessageStatus(
  socket: Socket,
  clientMessageId: string | undefined,
  status: "translating" | "saved" | "error",
  message?: string
): void {
  if (!clientMessageId) return;

  socket.emit("message_status", {
    clientMessageId,
    status,
    message
  });
}

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("connected: " + socket.id);

    socket.on("join_room", async (roomIdInput: unknown) => {
      const roomId = typeof roomIdInput === "string" ? roomIdInput.trim() : "";
      const roomError = validateRoomId(roomId);

      if (roomError) {
        socket.emit("error_message", roomError);
        return;
      }

      const previousRoomId =
        typeof socket.data.roomId === "string" ? socket.data.roomId : null;

      if (previousRoomId && previousRoomId !== roomId) {
        socket.leave(previousRoomId);
      }

      socket.data.roomId = roomId;
      socket.join(roomId);
      socket.emit("joined_room", roomId);
      console.log(socket.id + " joined room: " + roomId);

      try {
        const messages = await getRoomMessages(roomId);
        socket.emit(
          "room_history",
          messages.map((message) => toChatMessage(message))
        );
      } catch (error) {
        console.error("failed to load room history:", error);
        socket.emit("error_message", "Failed to load room history.");
      }
    });

    socket.on("send_message", async (payload: unknown) => {
      const validation = validateMessagePayload(payload);

      if (!validation.ok) {
        socket.emit("error_message", validation.error);
        return;
      }

      const {
        roomId,
        userName,
        text: originalText,
        sourceLang,
        targetLang,
        clientMessageId
      } = validation.value;

      emitMessageStatus(socket, clientMessageId, "translating");

      const translation = await translateMessage(originalText, {
        sourceLang,
        targetLang
      });

      try {
        const savedMessage = await saveMessage({
          roomId,
          userName,
          originalText,
          translatedText: translation.translatedText,
          sourceLang: translation.sourceLang,
          targetLang: translation.targetLang,
          translationMs: translation.translationMs
        });

        const message: ChatMessage = {
          ...toChatMessage(savedMessage, clientMessageId),
          cacheHit: translation.cacheHit
        };

        io.to(message.roomId).emit("receive_message", message);
        emitMessageStatus(socket, clientMessageId, "saved");
      } catch (error) {
        console.error("failed to save message:", error);

        const fallbackMessage: ChatMessage = {
          id: randomUUID(),
          roomId,
          userName,
          originalText,
          translatedText: translation.translatedText,
          sourceLang: translation.sourceLang,
          targetLang: translation.targetLang,
          translationMs: translation.translationMs,
          cacheHit: translation.cacheHit,
          clientMessageId,
          createdAt: new Date().toISOString()
        };

        io.to(roomId).emit("receive_message", fallbackMessage);
        emitMessageStatus(
          socket,
          clientMessageId,
          "error",
          "Message was sent but could not be saved."
        );
      }
    });

    socket.on("disconnect", () => {
      console.log("disconnected: " + socket.id);
    });
  });
}
