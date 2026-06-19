import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";

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

    socket.on("send_message", (payload: unknown) => {
      if (!isValidMessagePayload(payload)) {
        socket.emit("error_message", "メッセージ内容が不正です。");
        return;
      }

      const message: ChatMessage = {
        id: randomUUID(),
        roomId: payload.roomId.trim(),
        userName: payload.userName.trim(),
        originalText: payload.text.trim(),
        translatedText: null,
        createdAt: new Date().toISOString()
      };

      io.to(message.roomId).emit("receive_message", message);
    });

    socket.on("disconnect", () => {
      console.log("disconnected: " + socket.id);
    });
  });
}