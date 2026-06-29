import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ChatMessage,
  DisplayMessage,
  JoinedRoom,
  MessageStatusPayload,
  PendingChatMessage,
  TranslationDirection
} from "../lib/types";
import {
  validateMessage,
  validateInviteToken,
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
  activeInviteToken: string;
  userName: string;
  translationDirection: TranslationDirection;
  onRoomChange: (room: JoinedRoom) => void;
  onTranslatedMessages?: (messages: DisplayMessage[]) => void;
};

export function useChatSocket({
  activeRoomId,
  activeInviteToken,
  userName,
  translationDirection,
  onRoomChange,
  onTranslatedMessages
}: UseChatSocketParams) {
  const socketRef = useRef<Socket | null>(null);
  const activeRoomRef = useRef(activeRoomId);
  const activeInviteTokenRef = useRef(activeInviteToken);
  const onRoomChangeRef = useRef(onRoomChange);
  const onTranslatedMessagesRef = useRef(onTranslatedMessages);

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
    activeInviteTokenRef.current = activeInviteToken;
  }, [activeInviteToken]);

  useEffect(() => {
    onRoomChangeRef.current = onRoomChange;
  }, [onRoomChange]);

  useEffect(() => {
    onTranslatedMessagesRef.current = onTranslatedMessages;
  }, [onTranslatedMessages]);

  useEffect(() => {
    const socket = io(chatServerUrl, {
      autoConnect: false
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setStatusMessage("Connected. Create a room or join with an invite.");

      if (activeInviteTokenRef.current) {
        setIsLoadingHistory(true);
        socket.emit("join_room", {
          inviteToken: activeInviteTokenRef.current
        });
      } else if (activeRoomRef.current) {
        setIsLoadingHistory(true);
        socket.emit("join_room", {
          roomId: activeRoomRef.current
        });
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setStatusMessage("Disconnected from chat server.");
    });

    socket.on("room_created", (room: JoinedRoom) => {
      setStatusMessage("Created room: " + room.roomId);
    });

    socket.on("joined_room", (room: JoinedRoom) => {
      activeRoomRef.current = room.roomId;
      activeInviteTokenRef.current = room.inviteToken;
      onRoomChangeRef.current(room);
      setStatusMessage("Joined room: " + room.roomId);
    });

    socket.on("room_history", (history: ChatMessage[]) => {
      setMessages(history);
      onTranslatedMessagesRef.current?.(history);
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
      onTranslatedMessagesRef.current?.([message]);
    });

    socket.on("message_updated", (message: ChatMessage) => {
      setMessages((currentMessages) => {
        if (message.roomId !== activeRoomRef.current) {
          return currentMessages;
        }

        return currentMessages.map((current) =>
          current.id === message.id ? message : current
        );
      });

      onTranslatedMessagesRef.current?.([message]);
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
    (targetRoomIdOrInvite: string) => {
      if (!socketRef.current) return;

      const trimmedValue = targetRoomIdOrInvite.trim();
      const roomError = validateRoomId(trimmedValue);
      const inviteError = validateInviteToken(trimmedValue);

      if (roomError && inviteError) {
        setStatusMessage("Enter a valid room ID or invite token.");
        return;
      }

      activeRoomRef.current = "";
      setMessages([]);
      setIsLoadingHistory(true);
      socketRef.current.emit("join_room", {
        roomIdOrInvite: trimmedValue
      });
    },
    []
  );

  const createRoom = useCallback(() => {
    if (!socketRef.current) return;

    const trimmedUserName = userName.trim();
    const userNameError = validateUserName(trimmedUserName);

    if (userNameError) {
      setStatusMessage(userNameError);
      return;
    }

    setMessages([]);
    setIsLoadingHistory(true);
    socketRef.current.emit("create_room", {
      userName: trimmedUserName
    });
  }, [userName]);

  const deleteHistory = useCallback(async () => {
    const roomError = activeRoomId ? validateRoomId(activeRoomId) : "Room ID is required.";

    if (roomError) {
      setStatusMessage("Create or join a room before deleting history.");
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
      if (!activeRoomId || roomError) {
        setStatusMessage("Create or join a room before sending a message.");
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
        translationStatus: "pending",
        translationError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
