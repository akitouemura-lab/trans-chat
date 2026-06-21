"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type TranslationDirection = "auto" | "en-ja" | "ja-en";

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
  createdAt: string;
};

type PendingChatMessage = {
  id: string;
  clientMessageId: string;
  roomId: string;
  userName: string;
  originalText: string;
  translatedText: null;
  sourceLang: string | null;
  targetLang: string | null;
  translationMs: null;
  cacheHit?: boolean;
  createdAt: string;
  isPending: true;
  status: "sending" | "translating" | "error";
};

type DisplayMessage = ChatMessage | PendingChatMessage;

type MessageStatusPayload = {
  clientMessageId: string;
  status: "translating" | "saved" | "error";
  message?: string;
};

const chatServerUrl =
  process.env.NEXT_PUBLIC_CHAT_SERVER_URL ?? "http://localhost:4000";

function isPendingMessage(message: DisplayMessage): message is PendingChatMessage {
  return "isPending" in message && message.isPending;
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

function validateMessage(text: string): string | null {
  if (text.length === 0) return "Message is required.";
  if (text.length > 1000) return "Message must be 1000 characters or less.";

  return null;
}

function getDirectionLabel(direction: TranslationDirection): string {
  if (direction === "en-ja") return "EN -> JA";
  if (direction === "ja-en") return "JA -> EN";
  return "AUTO";
}

function getMessageDirectionLabel(message: DisplayMessage): string {
  if (message.sourceLang && message.targetLang) {
    return message.sourceLang.toUpperCase() + " -> " + message.targetLang.toUpperCase();
  }

  return "AUTO";
}

function createClientMessageId(): string {
  return "client-" + Date.now().toString() + "-" + Math.random().toString(36).slice(2);
}

function formatTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function Home() {
  const socketRef = useRef<Socket | null>(null);

  const [userName, setUserName] = useState("user1");
  const [roomInput, setRoomInput] = useState("room1");
  const [activeRoomId, setActiveRoomId] = useState("room1");
  const [text, setText] = useState("");
  const [translationDirection, setTranslationDirection] =
    useState<TranslationDirection>("auto");

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Not connected.");
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const savedUserName = window.localStorage.getItem("transchat-userName");
    const savedRoomId = window.localStorage.getItem("transchat-roomId");
    const savedTheme = window.localStorage.getItem("transchat-theme");

    if (savedUserName) setUserName(savedUserName);
    if (savedRoomId) {
      setRoomInput(savedRoomId);
      setActiveRoomId(savedRoomId);
    }
    if (savedTheme === "light") setIsDarkMode(false);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("transchat-userName", userName);
  }, [userName]);

  useEffect(() => {
    window.localStorage.setItem("transchat-roomId", activeRoomId);
  }, [activeRoomId]);

  useEffect(() => {
    window.localStorage.setItem("transchat-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    const socket = io(chatServerUrl, {
      autoConnect: false
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setStatusMessage("Connected to chat server.");
      setIsLoadingHistory(true);
      socket.emit("join_room", activeRoomId);
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
        const withoutMatchingPending = currentMessages.filter((current) => {
          if (!isPendingMessage(current)) return true;

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
    };
  }, []);

  function joinRoom(targetRoomId: string) {
    if (!socketRef.current) return;

    const trimmedRoomId = targetRoomId.trim();
    const roomError = validateRoomId(trimmedRoomId);

    if (roomError) {
      setStatusMessage(roomError);
      return;
    }

    setActiveRoomId(trimmedRoomId);
    setRoomInput(trimmedRoomId);
    setMessages([]);
    setIsLoadingHistory(true);
    socketRef.current.emit("join_room", trimmedRoomId);
  }

  function handleJoinRoom() {
    joinRoom(roomInput);
  }

  function handleCreateRoom() {
    const newRoomId = "room-" + Math.random().toString(36).slice(2, 8);
    joinRoom(newRoomId);
  }

  async function handleDeleteHistory() {
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
        chatServerUrl + "/rooms/" + encodeURIComponent(activeRoomId) + "/messages",
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        setStatusMessage("Failed to delete room history.");
        return;
      }

      setMessages([]);
      setStatusMessage("Room history deleted.");
    } catch {
      setStatusMessage("An error occurred while deleting room history.");
    } finally {
      setIsDeletingHistory(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!socketRef.current || !isConnected) {
      setStatusMessage("Server is not connected.");
      return;
    }

    const trimmedUserName = userName.trim();
    const trimmedText = text.trim();

    const roomError = validateRoomId(activeRoomId);
    if (roomError) {
      setStatusMessage(roomError);
      return;
    }

    const userNameError = validateUserName(trimmedUserName);
    if (userNameError) {
      setStatusMessage(userNameError);
      return;
    }

    const messageError = validateMessage(trimmedText);
    if (messageError) {
      setStatusMessage(messageError);
      return;
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

    setText("");
  }

  const appClass = isDarkMode
    ? "min-h-screen bg-slate-950 text-slate-100"
    : "min-h-screen bg-slate-100 text-slate-950";

  const panelClass = isDarkMode
    ? "border-slate-800 bg-slate-900"
    : "border-slate-200 bg-white";

  const mutedTextClass = isDarkMode ? "text-slate-300" : "text-slate-600";

  const inputClass = isDarkMode
    ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-400"
    : "border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500";

  return (
    <main className={appClass}>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 md:px-6">
        <header className={"sticky top-0 z-20 mb-4 rounded-2xl border p-4 shadow-xl backdrop-blur " + panelClass}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-400">TransChat</p>
              <h1 className="text-2xl font-bold md:text-3xl">
                Real-time Translation Chat
              </h1>
              <p className={"mt-1 text-sm " + mutedTextClass}>
                Room: <span className="font-semibold">{activeRoomId}</span> / User:{" "}
                <span className="font-semibold">{userName.trim() || "No name"}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  isConnected
                    ? "rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-sm text-green-400"
                    : "rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-sm text-red-400"
                }
              >
                {isConnected ? "Connected" : "Disconnected"}
              </span>

              <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-sm text-blue-400">
                {getDirectionLabel(translationDirection)}
              </span>

              <button
                type="button"
                onClick={() => setIsDarkMode((current) => !current)}
                className="rounded-full border border-slate-500/40 px-3 py-1 text-sm hover:bg-slate-500/10"
              >
                {isDarkMode ? "Light mode" : "Dark mode"}
              </button>
            </div>
          </div>
        </header>

        <section className={"mb-4 rounded-2xl border p-4 shadow-xl " + panelClass}>
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <label className="flex flex-col gap-1">
              <span className={"text-sm " + mutedTextClass}>User name</span>
              <input
                className={"rounded-lg border px-3 py-2 outline-none " + inputClass}
                value={userName}
                maxLength={30}
                onChange={(event) => setUserName(event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className={"text-sm " + mutedTextClass}>Room ID</span>
              <input
                className={"rounded-lg border px-3 py-2 outline-none " + inputClass}
                value={roomInput}
                maxLength={50}
                onChange={(event) => setRoomInput(event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className={"text-sm " + mutedTextClass}>Translation</span>
              <select
                className={"rounded-lg border px-3 py-2 outline-none " + inputClass}
                value={translationDirection}
                onChange={(event) =>
                  setTranslationDirection(event.target.value as TranslationDirection)
                }
              >
                <option value="auto">Auto detect</option>
                <option value="en-ja">English -&gt; Japanese</option>
                <option value="ja-en">Japanese -&gt; English</option>
              </select>
            </label>

            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={!isConnected || isLoadingHistory}
              className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              {isLoadingHistory ? "Joining..." : "Join room"}
            </button>

            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={!isConnected || isLoadingHistory}
              className="rounded-lg border border-blue-500 px-4 py-2 font-semibold text-blue-400 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:border-slate-500 disabled:text-slate-500"
            >
              Create
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={
                  isConnected
                    ? "h-2 w-2 rounded-full bg-green-400"
                    : "h-2 w-2 rounded-full bg-red-400"
                }
              />
              <span className={mutedTextClass}>
                {isLoadingHistory ? "Loading room history..." : statusMessage}
              </span>
            </div>

            <button
              type="button"
              onClick={handleDeleteHistory}
              disabled={isDeletingHistory}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-red-900"
            >
              {isDeletingHistory ? "Deleting..." : "Delete room history"}
            </button>
          </div>
        </section>

        <section className={"mb-4 flex-1 overflow-y-auto rounded-2xl border p-4 pb-28 shadow-xl " + panelClass}>
          {messages.length === 0 ? (
            <div className="flex min-h-80 items-center justify-center">
              <p className={"text-sm " + mutedTextClass}>
                No messages yet. Send your first translated message.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isMine = message.userName === userName.trim();

                return (
                  <div
                    key={message.id}
                    className={isMine ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={
                        isMine
                          ? "max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 p-4 text-white shadow-lg"
                          : isDarkMode
                            ? "max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-800 p-4 text-slate-100 shadow-lg"
                            : "max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-200 p-4 text-slate-950 shadow-lg"
                      }
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{message.userName}</p>
                        <p className="text-xs opacity-70">
                          {formatTime(message.createdAt)}
                        </p>
                      </div>

                      <p className="whitespace-pre-wrap text-base">
                        {message.originalText}
                      </p>

                      <div className="mt-3 rounded-xl bg-black/20 p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white/15 px-2 py-1 font-semibold">
                              {getMessageDirectionLabel(message)}
                            </span>

                            {message.cacheHit && (
                              <span className="rounded-full bg-emerald-500/20 px-2 py-1 font-semibold text-emerald-200">
                                Cached
                              </span>
                            )}

                            {isPendingMessage(message) && (
                              <span className="rounded-full bg-yellow-500/20 px-2 py-1 font-semibold text-yellow-200">
                                {message.status === "sending"
                                  ? "Sending..."
                                  : message.status === "translating"
                                    ? "Translating..."
                                    : "Error"}
                              </span>
                            )}
                          </div>

                          {message.translationMs !== null && (
                            <span className="opacity-80">{message.translationMs} ms</span>
                          )}
                        </div>

                        <p className="whitespace-pre-wrap text-sm">
                          {isPendingMessage(message)
                            ? message.status === "error"
                              ? "Could not save the message."
                              : "Translating..."
                            : message.translatedText ?? "Translation unavailable."}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <form
          onSubmit={handleSubmit}
          className={
            "sticky bottom-0 z-30 -mx-4 border-t p-4 backdrop-blur md:-mx-6 " +
            (isDarkMode
              ? "border-slate-800 bg-slate-950/95"
              : "border-slate-200 bg-slate-100/95")
          }
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row">
            <input
              className={"flex-1 rounded-xl border px-4 py-3 outline-none " + inputClass}
              placeholder="Type a message..."
              value={text}
              maxLength={1000}
              onChange={(event) => setText(event.target.value)}
            />

            <button
              type="submit"
              disabled={!isConnected || isSending || text.trim().length === 0}
              className="rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>

          <div className={"mt-2 flex justify-between text-xs " + mutedTextClass}>
            <span>
              {text.length}/1000 characters
            </span>
            <span>
              Current room: {activeRoomId}
            </span>
          </div>
        </form>
      </div>
    </main>
  );
}