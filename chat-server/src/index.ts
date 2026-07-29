import http from "node:http";
import express, { type Request } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket.js";
import {
  deleteRoomMessages,
  getRoomMessages
} from "./services/messageRepository.js";
import {
  getRoomByIdAndInviteToken,
  type RoomSummary
} from "./services/roomRepository.js";

type StoredMessage = {
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
};

dotenv.config();

const app = express();

function parseClientOrigins(value: string | undefined): string[] {
  if (!value) return [];

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const lanHost = process.env.LAN_HOST?.trim();
const clientOrigins = parseClientOrigins(process.env.CLIENT_ORIGIN);

if (clientOrigins.length === 0) {
  clientOrigins.push("http://localhost:3000", "http://127.0.0.1:3000");
}

if (lanHost) {
  const lanOrigin = "http://" + lanHost + ":3000";

  if (!clientOrigins.includes(lanOrigin)) {
    clientOrigins.push(lanOrigin);
  }
}

const port = Number(process.env.PORT ?? 4000);
const adminActionsEnabled = process.env.ENABLE_ADMIN_ACTIONS === "true";

function getBearerInviteToken(req: Request): string | null {
  const authorization = req.header("authorization")?.trim();
  if (!authorization) return null;

  const match = /^Bearer\s+([a-zA-Z0-9_-]{1,128})$/i.exec(authorization);
  return match?.[1] ?? null;
}

async function getAuthorizedRoom(
  req: Request,
  roomId: string
): Promise<
  | { ok: true; room: RoomSummary }
  | { ok: false; status: 401 | 404; message: string }
> {
  const inviteToken = getBearerInviteToken(req);

  if (!inviteToken) {
    return {
      ok: false,
      status: 401,
      message: "invite token is required"
    };
  }

  const room = await getRoomByIdAndInviteToken(roomId, inviteToken);

  if (!room) {
    return {
      ok: false,
      status: 404,
      message: "room not found or invite token is invalid"
    };
  }

  return {
    ok: true,
    room
  };
}

app.use(
  cors({
    origin: clientOrigins,
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

    const access = await getAuthorizedRoom(req, roomId);
    if (!access.ok) {
      if (access.status === 401) {
        res.setHeader("WWW-Authenticate", "Bearer");
      }

      res.status(access.status).json({
        message: access.message
      });
      return;
    }

    const messages = await getRoomMessages(access.room.id);

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
        translationStatus: message.translationStatus,
        translationError: message.translationError,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString()
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
  if (!adminActionsEnabled) {
    res.status(403).json({
      message: "admin actions disabled"
    });
    return;
  }

  try {
    const roomId = req.params.roomId.trim();

    if (roomId.length === 0) {
      res.status(400).json({
        message: "roomId is required"
      });
      return;
    }

    const access = await getAuthorizedRoom(req, roomId);
    if (!access.ok) {
      if (access.status === 401) {
        res.setHeader("WWW-Authenticate", "Bearer");
      }

      res.status(access.status).json({
        message: access.message
      });
      return;
    }

    const result = await deleteRoomMessages(access.room.id);

    res.json({
      message: "messages deleted",
      roomId: access.room.id,
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
    origin: clientOrigins,
    methods: ["GET", "POST"]
  }
});

registerSocketHandlers(io);

httpServer.listen(port, "0.0.0.0", () => {
  console.log("chat-server is running on http://0.0.0.0:" + port);
});
