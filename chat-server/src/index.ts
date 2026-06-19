import http from "node:http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket.js";

dotenv.config();

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
const port = Number(process.env.PORT ?? 4000);

app.use(
  cors({
    origin: clientOrigin,
    credentials: true
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "chat-server"
  });
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