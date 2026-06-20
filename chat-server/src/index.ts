import http from "node:http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket.js";
import {
  deleteRoomMessages,
  getRoomMessages
} from "./services/messageRepository.js";

type StoredMessage = {
  id: string;
  roomId: string;
  userName: string;
  originalText: string;
  translatedText: string | null;
  sourceLang: string | null;
  targetLang: string | null;
  translationMs: number | null;
  createdAt: Date;
};

dotenv.config();

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
const port = Number(process.env.PORT ?? 4000);

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"]
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "chat-server"
  });
});

app.get("/rooms/:roomId/messages", async (req, res) => {
  try {
    const roomId = req.params.roomId.trim();

    if (roomId.length === 0) {
      res.status(400).json({
        message: "roomId is required"
      });
      return;
    }

    const messages = await getRoomMessages(roomId);

    res.json({
      messages: messages.map((message: StoredMessage) => ({
        id: message.id,
        roomId: message.roomId,
        userName: message.userName,
        originalText: message.originalText,
        translatedText: message.translatedText,
        sourceLang: message.sourceLang,
        targetLang: message.targetLang,
        translationMs: message.translationMs,
        createdAt: message.createdAt.toISOString()
      }))
    });
  } catch (error) {
    console.error("failed to get room messages:", error);
    res.status(500).json({
      message: "failed to get room messages"
    });
  }
});

app.delete("/rooms/:roomId/messages", async (req, res) => {
  try {
    const roomId = req.params.roomId.trim();

    if (roomId.length === 0) {
      res.status(400).json({
        message: "roomId is required"
      });
      return;
    }

    const result = await deleteRoomMessages(roomId);

    res.json({
      message: "messages deleted",
      roomId,
      deletedCount: result.count
    });
  } catch (error) {
    console.error("failed to delete room messages:", error);
    res.status(500).json({
      message: "failed to delete room messages"
    });
  }
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST"]
  }
});

registerSocketHandlers(io);

httpServer.listen(port, () => {
  console.log("chat-server is running on http://localhost:" + port);
});