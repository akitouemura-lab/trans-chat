import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ChatMessage,
  DisplayMessage,
  MessageStatusPayload,
  PendingChatMessage,
  TranslationDirection
} from "../lib/types";
import {
  validateMessage,
  validateRoomId,
  validateUserName
} from "../lib/validation";

const chatServerUrl =
  process.env.NEXT_PUBLIC_CHAT_SERVER_URL ?? "http://localhost:4000";

function isPendingMessage(message: DisplayMessage): message is PendingChatMessage {
  return "isPending" in message && message.isPending;
}

function createClientMessageId(): string {
  return (
    "client-" +
    Date.now().toString() +
    "-" +
    Math.random().toString(36).slice(2)
  );
}

type UseChatSocketParams = {
  activeRoomId: string;
  userName: string;
  translationDirection: TranslationDirection;
  onRoomChange: (roomId: string) => void;
};

export function useChatSocket({
  activeRoomId,
  userName,
  translationDirection,
  onRoomChange
}: UseChatSocketParams) {
  const socketRef = useRef<Socket | null>(null);
  const activeRoomRef = useRef(activeRoomId);

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Not connected.");

  useEffect(() => {
    activeRoomRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    const socket = io(chatServerUrl, {
      autoConnect: false
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setStatusMessage("Connected to chat server.");
      setIsLoadingHistory(true);
      socket.emit("join_room", activeRoomRef.current);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setStatusMessage("Disconnected from chat server.");
    });

    socket.on("joined_room", (joinedRoomId: string) => {
      setStatusMessage("Joined room: " + joinedRoomId);
    });

    socket.on("room_history", (history: ChatMessage[]) => {
      setMessages(history);
      setIsLoadingHistory(false);
    });

    socket.on("receive_message", (message: ChatMessage) => {
      setMessages((currentMessages) => {
        if (message.roomId !== activeRoomRef.current) {
          return currentMessages;
        }

        const withoutMatchingPending = currentMessages.filter((current) => {
          if (!isPendingMessage(current)) return true;

          if (message.clientMessageId) {
            return current.clientMessageId !== message.clientMessageId;
          }

          return !(
            current.roomId === message.roomId &&
            current.userName === message.userName &&
            current.originalText === message.originalText
          );
        });

        if (withoutMatchingPending.some((current) => current.id === message.id)) {
          return withoutMatchingPending;
        }

        return [...withoutMatchingPending, message];
      });

      setIsSending(false);
    });

    socket.on("message_status", (payload: MessageStatusPayload) => {
      setMessages((currentMessages) =>
        currentMessages.map((message) => {
          if (
            isPendingMessage(message) &&
            message.clientMessageId === payload.clientMessageId
          ) {
            if (payload.status === "translating") {
              return {
                ...message,
                status: "translating"
              };
            }

            if (payload.status === "error") {
              return {
                ...message,
                status: "error"
              };
            }
          }

          return message;
        })
      );

      if (payload.status === "saved" || payload.status === "error") {
        setIsSending(false);
      }

      if (payload.message) {
        setStatusMessage(payload.message);
      }
    });

    socket.on("error_message", (message: string) => {
      setStatusMessage(message);
      setIsSending(false);
      setIsLoadingHistory(false);
    });

    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const joinRoom = useCallback(
    (targetRoomId: string) => {
      if (!socketRef.current) return;

      const trimmedRoomId = targetRoomId.trim();
      const roomError = validateRoomId(trimmedRoomId);

      if (roomError) {
        setStatusMessage(roomError);
        return;
      }

      activeRoomRef.current = trimmedRoomId;
      onRoomChange(trimmedRoomId);
      setMessages([]);
      setIsLoadingHistory(true);
      socketRef.current.emit("join_room", trimmedRoomId);
    },
    [onRoomChange]
  );

  const createRoom = useCallback(() => {
    const newRoomId = "room-" + Math.random().toString(36).slice(2, 8);
    joinRoom(newRoomId);
  }, [joinRoom]);

  const deleteHistory = useCallback(async () => {
    const roomError = validateRoomId(activeRoomId);

    if (roomError) {
      setStatusMessage(roomError);
      return;
    }

    const confirmed = window.confirm(
      "Delete all messages in room '" + activeRoomId + "'?"
    );

    if (!confirmed) return;

    try {
      setIsDeletingHistory(true);

      const response = await fetch(
        chatServerUrl +
          "/rooms/" +
          encodeURIComponent(activeRoomId) +
          "/messages",
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        let message = "Failed to delete room history.";

        try {
          const body = (await response.json()) as { message?: string };
          if (body.message) message = body.message;
        } catch {
          // Keep the generic message when the response is not JSON.
        }

        setStatusMessage(message);
        return;
      }

      setMessages([]);
      setStatusMessage("Room history deleted.");
    } catch {
      setStatusMessage("An error occurred while deleting room history.");
    } finally {
      setIsDeletingHistory(false);
    }
  }, [activeRoomId]);

  const sendMessage = useCallback(
    (messageText: string): boolean => {
      if (!socketRef.current || !isConnected) {
        setStatusMessage("Server is not connected.");
        return false;
      }

      const trimmedUserName = userName.trim();
      const trimmedText = messageText.trim();

      const roomError = validateRoomId(activeRoomId);
      if (roomError) {
        setStatusMessage(roomError);
        return false;
      }

      const userNameError = validateUserName(trimmedUserName);
      if (userNameError) {
        setStatusMessage(userNameError);
        return false;
      }

      const messageError = validateMessage(trimmedText);
      if (messageError) {
        setStatusMessage(messageError);
        return false;
      }

      const clientMessageId = createClientMessageId();

      const pendingMessage: PendingChatMessage = {
        id: clientMessageId,
        clientMessageId,
        roomId: activeRoomId,
        userName: trimmedUserName,
        originalText: trimmedText,
        translatedText: null,
        sourceLang: null,
        targetLang: null,
        translationMs: null,
        createdAt: new Date().toISOString(),
        isPending: true,
        status: "sending"
      };

      setMessages((currentMessages) => [...currentMessages, pendingMessage]);
      setIsSending(true);
      setStatusMessage("Sending message...");

      socketRef.current.emit("send_message", {
        roomId: activeRoomId,
        userName: trimmedUserName,
        text: trimmedText,
        translationDirection,
        clientMessageId
      });

      return true;
    },
    [activeRoomId, isConnected, translationDirection, userName]
  );

  return {
    messages,
    isConnected,
    isLoadingHistory,
    isDeletingHistory,
    isSending,
    statusMessage,
    joinRoom,
    createRoom,
    deleteHistory,
    sendMessage
  };
}
