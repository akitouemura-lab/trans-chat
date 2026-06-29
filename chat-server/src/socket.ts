import type { Server, Socket } from "socket.io";
import {
  detectTargetLang,
  translateMessage,
  type SourceLang,
  type TargetLang
} from "./services/translation.js";
import {
  getRoomMessages,
  saveMessage,
  updateMessageTranslation
} from "./services/messageRepository.js";
import {
  createOrGetGuestUser,
  createRoom,
  getRoomById,
  getRoomByInviteToken,
  type RoomSummary
} from "./services/roomRepository.js";
import { checkMessageRateLimit } from "./services/rateLimiter.js";

type TranslationDirection = "auto" | "en-ja" | "ja-en";
type TranslationStatus = "pending" | "completed" | "failed";

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
  translationStatus: TranslationStatus;
  translationError: string | null;
  cacheHit?: boolean;
  clientMessageId?: string;
  createdAt: string;
  updatedAt: string;
};

type JoinedRoomPayload = {
  roomId: string;
  roomName: string | null;
  inviteToken: string;
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
  if (roomId.length > 80) return "Room ID must be 80 characters or less.";
  if (!/^[a-zA-Z0-9_-]+$/.test(roomId)) {
    return "Room ID can only contain letters, numbers, hyphens, and underscores.";
  }

  return null;
}

function validateInviteToken(inviteToken: string): string | null {
  if (inviteToken.length === 0) return "Invite token is required.";
  if (inviteToken.length > 128) {
    return "Invite token must be 128 characters or less.";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(inviteToken)) {
    return "Invite token is invalid.";
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

function toRoomPayload(room: RoomSummary): JoinedRoomPayload {
  return {
    roomId: room.id,
    roomName: room.name,
    inviteToken: room.inviteToken
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
    translationStatus: string;
    translationError: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  clientMessageId?: string
): ChatMessage {
  const translationStatus: TranslationStatus =
    message.translationStatus === "completed" ||
    message.translationStatus === "failed"
      ? message.translationStatus
      : "pending";

  const chatMessage: ChatMessage = {
    id: message.id,
    roomId: message.roomId,
    userName: message.userName,
    originalText: message.originalText,
    translatedText: message.translatedText,
    sourceLang: message.sourceLang,
    targetLang: message.targetLang,
    translationMs: message.translationMs,
    translationStatus,
    translationError: message.translationError,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString()
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

async function resolveRoomFromJoinPayload(
  payload: unknown
): Promise<RoomSummary | null> {
  if (typeof payload === "string") {
    const value = payload.trim();
    if (value.length === 0) return null;

    const tokenError = validateInviteToken(value);
    if (!tokenError) {
      const roomByToken = await getRoomByInviteToken(value);
      if (roomByToken) return roomByToken;
    }

    const roomError = validateRoomId(value);
    if (!roomError) return getRoomById(value);

    return null;
  }

  if (!isRecord(payload)) return null;

  const inviteToken =
    typeof payload.inviteToken === "string" ? payload.inviteToken.trim() : "";
  const roomId = typeof payload.roomId === "string" ? payload.roomId.trim() : "";
  const roomIdOrInvite =
    typeof payload.roomIdOrInvite === "string"
      ? payload.roomIdOrInvite.trim()
      : "";

  if (inviteToken.length > 0 && validateInviteToken(inviteToken) === null) {
    return getRoomByInviteToken(inviteToken);
  }

  if (roomId.length > 0 && validateRoomId(roomId) === null) {
    return getRoomById(roomId);
  }

  if (roomIdOrInvite.length > 0) {
    return resolveRoomFromJoinPayload(roomIdOrInvite);
  }

  return null;
}

async function joinSocketToRoom(socket: Socket, room: RoomSummary) {
  const previousRoomId =
    typeof socket.data.roomId === "string" ? socket.data.roomId : null;

  if (previousRoomId && previousRoomId !== room.id) {
    socket.leave(previousRoomId);
  }

  socket.data.roomId = room.id;
  socket.join(room.id);
  socket.emit("joined_room", toRoomPayload(room));
  console.log(socket.id + " joined room: " + room.id);

  const messages = await getRoomMessages(room.id);
  socket.emit(
    "room_history",
    messages.map((message) => toChatMessage(message))
  );
}

async function translateAndBroadcast(
  io: Server,
  roomId: string,
  messageId: string,
  originalText: string,
  sourceLang: SourceLang,
  targetLang: TargetLang
) {
  const translation = await translateMessage(originalText, {
    sourceLang,
    targetLang
  });
  const translationStatus: TranslationStatus = translation.translatedText
    ? "completed"
    : "failed";

  try {
    const updatedMessage = await updateMessageTranslation(messageId, {
      translatedText: translation.translatedText,
      sourceLang: translation.sourceLang,
      targetLang: translation.targetLang,
      translationMs: translation.translationMs,
      translationStatus,
      translationError:
        translationStatus === "failed"
          ? (translation.errorMessage ?? "Translation failed.")
          : null
    });

    const payload: ChatMessage = {
      ...toChatMessage(updatedMessage),
      cacheHit: translation.cacheHit
    };

    io.to(roomId).emit("message_updated", payload);
  } catch (error) {
    console.error("failed to update translated message:", error);
  }
}

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("connected: " + socket.id);

    socket.on("create_room", async (payload: unknown) => {
      const roomName =
        isRecord(payload) && typeof payload.roomName === "string"
          ? payload.roomName.trim()
          : undefined;
      const userName =
        isRecord(payload) && typeof payload.userName === "string"
          ? payload.userName.trim()
          : "";

      const userNameError = validateUserName(userName);
      if (userNameError) {
        socket.emit("error_message", userNameError);
        return;
      }

      try {
        await createOrGetGuestUser(userName);
        const room = await createRoom(roomName);
        socket.emit("room_created", toRoomPayload(room));
        await joinSocketToRoom(socket, room);
      } catch (error) {
        console.error("failed to create room:", error);
        socket.emit("error_message", "Failed to create room.");
      }
    });

    socket.on("join_room", async (payload: unknown) => {
      try {
        const room = await resolveRoomFromJoinPayload(payload);

        if (!room) {
          socket.emit("error_message", "Room not found or invite token is invalid.");
          return;
        }

        await joinSocketToRoom(socket, room);
      } catch (error) {
        console.error("failed to join room:", error);
        socket.emit("error_message", "Failed to join room.");
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

      if (socket.data.roomId !== roomId) {
        socket.emit("error_message", "Join the room before sending a message.");
        emitMessageStatus(socket, clientMessageId, "error");
        return;
      }

      const rateLimit = checkMessageRateLimit(socket.id, roomId);
      if (!rateLimit.allowed) {
        const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
        const message =
          "You are sending messages too quickly. Try again in " +
          retryAfterSeconds +
          " seconds.";
        socket.emit("error_message", message);
        emitMessageStatus(socket, clientMessageId, "error", message);
        return;
      }

      try {
        const room = await getRoomById(roomId);
        if (!room) {
          socket.emit("error_message", "Room no longer exists.");
          emitMessageStatus(socket, clientMessageId, "error");
          return;
        }

        const user = await createOrGetGuestUser(userName);
        const savedMessage = await saveMessage({
          roomId,
          userId: user.id,
          userName: user.displayName,
          originalText,
          translatedText: null,
          sourceLang: sourceLang === "auto" ? null : sourceLang,
          targetLang,
          translationMs: null,
          translationStatus: "pending",
          translationError: null
        });

        const message = toChatMessage(savedMessage, clientMessageId);

        io.to(message.roomId).emit("receive_message", message);
        emitMessageStatus(socket, clientMessageId, "translating");

        void translateAndBroadcast(
          io,
          roomId,
          savedMessage.id,
          originalText,
          sourceLang,
          targetLang
        );
      } catch (error) {
        console.error("failed to save message:", error);
        socket.emit("error_message", "Message could not be sent.");
        emitMessageStatus(socket, clientMessageId, "error");
      }
    });

    socket.on("disconnect", () => {
      console.log("disconnected: " + socket.id);
    });
  });
}
