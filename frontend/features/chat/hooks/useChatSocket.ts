import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ChatMessage,
  DisplayMessage,
  JoinedRoom,
  MessageStatusPayload,
  PendingChatMessage,
  RoomAction,
  RoomActionAcknowledgement,
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
const ROOM_ACTION_TIMEOUT_MS = 10000;

type RoomOperation = "create" | "join" | "restore";

function isPendingMessage(message: DisplayMessage): message is PendingChatMessage {
  return "isPending" in message && message.isPending;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRoomActionAcknowledgement(
  value: unknown
): value is RoomActionAcknowledgement {
  if (!isRecord(value) || typeof value.ok !== "boolean") return false;

  if (!value.ok) {
    return typeof value.error === "string";
  }

  if (!isRecord(value.room) || !Array.isArray(value.messages)) return false;

  return (
    typeof value.room.roomId === "string" &&
    (typeof value.room.roomName === "string" ||
      value.room.roomName === null) &&
    typeof value.room.inviteToken === "string"
  );
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
  const roomRequestIdRef = useRef(0);
  const roomActionRef = useRef<RoomAction | null>(null);

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [roomAction, setRoomAction] = useState<RoomAction | null>(null);
  const [roomActionError, setRoomActionError] = useState("");
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

  const finishRoomAction = useCallback(
    (
      response: Extract<RoomActionAcknowledgement, { ok: true }>,
      operation: RoomOperation
    ) => {
      roomActionRef.current = null;
      activeRoomRef.current = response.room.roomId;
      activeInviteTokenRef.current = response.room.inviteToken;

      setRoomAction(null);
      setMessages(response.messages);
      setIsSending(false);

      if (operation === "restore") {
        setRoomActionError((currentError) =>
          currentError
            ? currentError + " Previous room was restored."
            : ""
        );
      } else {
        setRoomActionError("");
      }

      onRoomChangeRef.current(response.room);
      onTranslatedMessagesRef.current?.(response.messages);

      if (operation === "create") {
        setStatusMessage("Created room: " + response.room.roomId);
      } else if (operation === "restore") {
        setStatusMessage("Rejoined room: " + response.room.roomId);
      } else {
        setStatusMessage("Joined room: " + response.room.roomId);
      }
    },
    []
  );

  const failRoomAction = useCallback((message: string) => {
    roomActionRef.current = null;
    setRoomAction(null);
    setRoomActionError(message);
    setStatusMessage(message);
  }, []);

  const requestRoomAction = useCallback(
    (
      socket: Socket,
      eventName: "create_room" | "join_room",
      payload: Record<string, string>,
      operation: RoomOperation
    ) => {
      const requestId = roomRequestIdRef.current + 1;
      const nextRoomAction: RoomAction =
        operation === "create" ? "creating" : "joining";

      roomRequestIdRef.current = requestId;
      roomActionRef.current = nextRoomAction;
      setRoomAction(nextRoomAction);

      if (operation !== "restore") {
        setRoomActionError("");
      }

      setStatusMessage(
        operation === "create"
          ? "Creating room..."
          : operation === "restore"
            ? "Restoring previous room..."
            : "Joining room..."
      );

      socket.timeout(ROOM_ACTION_TIMEOUT_MS).emit(
        eventName,
        payload,
        (timeoutError: Error | null, response: unknown) => {
          if (requestId !== roomRequestIdRef.current) return;

          if (timeoutError) {
            roomRequestIdRef.current += 1;
            const message =
              operation === "create"
                ? "Room creation timed out before the server confirmed it."
                : operation === "restore"
                  ? "Restoring the previous room timed out."
                  : "Room join timed out before the server confirmed it.";

            failRoomAction(message);

            if (operation !== "restore") {
              if (socket.connected) {
                socket.disconnect();
              }
              socket.connect();
            }
            return;
          }

          if (!isRoomActionAcknowledgement(response)) {
            roomRequestIdRef.current += 1;
            failRoomAction("The server returned an invalid room response.");

            if (operation !== "restore") {
              if (socket.connected) {
                socket.disconnect();
              }
              socket.connect();
            }
            return;
          }

          roomRequestIdRef.current += 1;

          if (!response.ok) {
            failRoomAction(response.error);
            return;
          }

          finishRoomAction(response, operation);
        }
      );
    },
    [failRoomAction, finishRoomAction]
  );

  useEffect(() => {
    const socket = io(chatServerUrl, {
      autoConnect: false
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);

      if (activeInviteTokenRef.current) {
        requestRoomAction(
          socket,
          "join_room",
          {
            inviteToken: activeInviteTokenRef.current
          },
          "restore"
        );
      } else {
        setStatusMessage("Connected. Create a room or join with an invite.");
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      roomRequestIdRef.current += 1;

      const interruptedAction = roomActionRef.current;
      roomActionRef.current = null;
      setRoomAction(null);

      if (interruptedAction) {
        const message =
          interruptedAction === "creating"
            ? "Connection lost before room creation was confirmed."
            : "Connection lost before the room join was confirmed.";
        setRoomActionError(message);
        setStatusMessage(message);
      } else {
        setStatusMessage("Disconnected from chat server.");
      }
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
    });

    socket.connect();

    return () => {
      roomRequestIdRef.current += 1;
      roomActionRef.current = null;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [requestRoomAction]);

  const joinRoom = useCallback(
    (targetInviteToken: string) => {
      const socket = socketRef.current;

      if (!socket || !socket.connected) {
        const message = "Server is not connected.";
        setRoomActionError(message);
        setStatusMessage(message);
        return;
      }

      if (roomActionRef.current) return;

      const trimmedValue = targetInviteToken.trim();
      const inviteError = validateInviteToken(trimmedValue);

      if (inviteError) {
        const message = "Enter a valid invite token.";
        setRoomActionError(message);
        setStatusMessage(message);
        return;
      }

      requestRoomAction(
        socket,
        "join_room",
        {
          inviteToken: trimmedValue
        },
        "join"
      );
    },
    [requestRoomAction]
  );

  const createRoom = useCallback(() => {
    const socket = socketRef.current;

    if (!socket || !socket.connected) {
      const message = "Server is not connected.";
      setRoomActionError(message);
      setStatusMessage(message);
      return;
    }

    if (roomActionRef.current) return;

    const trimmedUserName = userName.trim();
    const userNameError = validateUserName(trimmedUserName);

    if (userNameError) {
      setRoomActionError(userNameError);
      setStatusMessage(userNameError);
      return;
    }

    requestRoomAction(
      socket,
      "create_room",
      {
        userName: trimmedUserName
      },
      "create"
    );
  }, [requestRoomAction, userName]);

  const deleteHistory = useCallback(async () => {
    if (roomActionRef.current) {
      setStatusMessage("Wait for the current room action to finish.");
      return;
    }

    const roomError = activeRoomId
      ? validateRoomId(activeRoomId)
      : "Room ID is required.";

    const inviteError = validateInviteToken(activeInviteToken);

    if (roomError || inviteError) {
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
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + activeInviteToken
          }
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
  }, [activeInviteToken, activeRoomId]);

  const sendMessage = useCallback(
    (messageText: string): boolean => {
      if (!socketRef.current || !isConnected) {
        setStatusMessage("Server is not connected.");
        return false;
      }

      if (roomActionRef.current) {
        setStatusMessage("Wait for the current room action to finish.");
        return false;
      }

      const trimmedUserName = userName.trim();
      const trimmedText = messageText.trim();

      const roomError = validateRoomId(activeRoomId);
      const inviteError = validateInviteToken(activeInviteToken);
      if (!activeRoomId || roomError || inviteError) {
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
    [
      activeInviteToken,
      activeRoomId,
      isConnected,
      translationDirection,
      userName
    ]
  );

  const isCreatingRoom = roomAction === "creating";
  const isJoiningRoom = roomAction === "joining";
  const isRoomActionPending = roomAction !== null;

  return {
    messages,
    isConnected,
    isCreatingRoom,
    isJoiningRoom,
    isRoomActionPending,
    roomActionError,
    isDeletingHistory,
    isSending,
    statusMessage,
    joinRoom,
    createRoom,
    deleteHistory,
    sendMessage
  };
}
