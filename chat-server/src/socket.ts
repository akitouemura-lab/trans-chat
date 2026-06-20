import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import { translateMessage } from "./services/translation.js";
import { saveMessage } from "./services/messageRepository.js";

type SendMessagePayload = {
  roomId: string;
  userName: string;
  text: string;
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
  createdAt: string;
};

function isValidMessagePayload(payload: unknown): payload is SendMessagePayload {
  if (typeof payload !== "object" || payload === null) return false;

  const data = payload as Record<string, unknown>;

  return (
    typeof data.roomId === "string" &&
    typeof data.userName === "string" &&
    typeof data.text === "string" &&
    data.roomId.trim().length > 0 &&
    data.userName.trim().length > 0 &&
    data.text.trim().length > 0 &&
    data.text.length <= 1000
  );
}

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("connected: " + socket.id);

    socket.on("join_room", (roomId: string) => {
      if (typeof roomId !== "string" || roomId.trim().length === 0) {
        socket.emit("error_message", "ルームIDが不正です。");
        return;
      }

      socket.join(roomId);
      socket.emit("joined_room", roomId);
      console.log(socket.id + " joined room: " + roomId);
    });

    socket.on("send_message", async (payload: unknown) => {
      if (!isValidMessagePayload(payload)) {
        socket.emit("error_message", "メッセージ内容が不正です。");
        return;
      }

      const roomId = payload.roomId.trim();
      const userName = payload.userName.trim();
      const originalText = payload.text.trim();

      const translation = await translateMessage(originalText);

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
          id: savedMessage.id,
          roomId: savedMessage.roomId,
          userName: savedMessage.userName,
          originalText: savedMessage.originalText,
          translatedText: savedMessage.translatedText,
          sourceLang: savedMessage.sourceLang,
          targetLang: savedMessage.targetLang,
          translationMs: savedMessage.translationMs,
          createdAt: savedMessage.createdAt.toISOString()
        };

        io.to(message.roomId).emit("receive_message", message);
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
          createdAt: new Date().toISOString()
        };

        io.to(roomId).emit("receive_message", fallbackMessage);
      }
    });

    socket.on("disconnect", () => {
      console.log("disconnected: " + socket.id);
    });
  });
}