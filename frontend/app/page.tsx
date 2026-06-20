"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

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

type HistoryResponse = {
  messages: ChatMessage[];
};

const chatServerUrl =
  process.env.NEXT_PUBLIC_CHAT_SERVER_URL ?? "http://localhost:4000";

export default function Home() {
  const socketRef = useRef<Socket | null>(null);

  const [userName, setUserName] = useState("user1");
  const [roomId, setRoomId] = useState("room1");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState("未接続です。");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);

  async function loadHistory(targetRoomId: string) {
    try {
      setIsLoadingHistory(true);

      const response = await fetch(
        chatServerUrl + "/rooms/" + encodeURIComponent(targetRoomId) + "/messages"
      );

      if (!response.ok) {
        setStatusMessage("履歴の取得に失敗しました。");
        return;
      }

      const data = (await response.json()) as HistoryResponse;
      setMessages(data.messages);
      setStatusMessage("ルーム " + targetRoomId + " の履歴を読み込みました。");
    } catch {
      setStatusMessage("履歴取得中にエラーが発生しました。");
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function handleDeleteHistory() {
    const trimmedRoomId = roomId.trim();

    if (trimmedRoomId.length === 0) {
      setStatusMessage("ルームIDを入力してください。");
      return;
    }

    const confirmed = window.confirm(
      "このルームの履歴をすべて削除しますか？"
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeletingHistory(true);

      const response = await fetch(
        chatServerUrl + "/rooms/" + encodeURIComponent(trimmedRoomId) + "/messages",
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        setStatusMessage("履歴の削除に失敗しました。");
        return;
      }

      setMessages([]);
      setStatusMessage("ルーム " + trimmedRoomId + " の履歴を削除しました。");
    } catch {
      setStatusMessage("履歴削除中にエラーが発生しました。");
    } finally {
      setIsDeletingHistory(false);
    }
  }

  useEffect(() => {
    const socket = io(chatServerUrl, {
      autoConnect: false
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setStatusMessage("chat-server に接続しました。");
      socket.emit("join_room", roomId);
      void loadHistory(roomId);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setStatusMessage("chat-server から切断されました。");
    });

    socket.on("joined_room", (joinedRoomId: string) => {
      setStatusMessage("ルーム " + joinedRoomId + " に参加しました。");
    });

    socket.on("receive_message", (message: ChatMessage) => {
      setMessages((currentMessages) => [...currentMessages, message]);
    });

    socket.on("error_message", (message: string) => {
      setStatusMessage(message);
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleJoinRoom = async () => {
    if (!socketRef.current) return;

    const trimmedRoomId = roomId.trim();

    if (trimmedRoomId.length === 0) {
      setStatusMessage("ルームIDを入力してください。");
      return;
    }

    socketRef.current.emit("join_room", trimmedRoomId);
    await loadHistory(trimmedRoomId);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!socketRef.current || !isConnected) {
      setStatusMessage("サーバーに接続されていません。");
      return;
    }

    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      setStatusMessage("メッセージを入力してください。");
      return;
    }

    socketRef.current.emit("send_message", {
      roomId,
      userName,
      text: trimmedText
    });

    setText("");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-blue-300">TransChat</p>
            <h1 className="text-3xl font-bold">
              翻訳機能付きリアルタイムチャット
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              日本語と英語を自動翻訳しながら会話できるWebアプリです。
            </p>
          </div>

          <div className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">
            {isConnected ? "接続中" : "未接続"}
          </div>
        </header>

        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">ユーザー名</span>
              <input
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-400"
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">ルームID</span>
              <input
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-400"
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
              />
            </label>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleJoinRoom}
                className="flex-1 rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400"
              >
                ルーム参加・履歴読込
              </button>

              <button
                type="button"
                onClick={handleDeleteHistory}
                disabled={isDeletingHistory}
                className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-red-900"
              >
                {isDeletingHistory ? "削除中" : "履歴削除"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm">
            <span
              className={
                isConnected
                  ? "h-2 w-2 rounded-full bg-green-400"
                  : "h-2 w-2 rounded-full bg-red-400"
              }
            />
            <span className="text-slate-300">
              {isLoadingHistory ? "履歴を読み込み中..." : statusMessage}
            </span>
          </div>
        </section>

        <section className="mb-4 flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-80 items-center justify-center">
              <p className="text-sm text-slate-500">
                まだメッセージはありません。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isMine = message.userName === userName;

                return (
                  <div
                    key={message.id}
                    className={isMine ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={
                        isMine
                          ? "max-w-[80%] rounded-2xl rounded-br-sm bg-blue-600 p-4 text-white shadow-lg"
                          : "max-w-[80%] rounded-2xl rounded-bl-sm bg-slate-800 p-4 text-slate-100 shadow-lg"
                      }
                    >
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold">
                          {message.userName}
                        </p>
                        <p className="text-xs opacity-70">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </p>
                      </div>

                      <p className="whitespace-pre-wrap text-base">
                        {message.originalText}
                      </p>

                      <div className="mt-3 rounded-xl bg-black/20 p-3">
                        <div className="mb-1 flex items-center justify-between gap-3 text-xs opacity-80">
                          <span>
                            {message.sourceLang && message.targetLang
                              ? message.sourceLang.toUpperCase() +
                                " → " +
                                message.targetLang.toUpperCase()
                              : "翻訳"}
                          </span>
                          {message.translationMs !== null && (
                            <span>{message.translationMs} ms</span>
                          )}
                        </div>

                        <p className="whitespace-pre-wrap text-sm">
                          {message.translatedText ??
                            "翻訳できませんでした。原文のみ表示しています。"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-blue-400"
            placeholder="メッセージを入力"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button
            type="submit"
            className="rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-400"
          >
            送信
          </button>
        </form>
      </div>
    </main>
  );
}