"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type ChatMessage = {
  id: string;
  roomId: string;
  userName: string;
  originalText: string;
  translatedText: string | null;
  createdAt: string;
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

  useEffect(() => {
    const socket = io(chatServerUrl, {
      autoConnect: false
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setStatusMessage("chat-server に接続しました。");
      socket.emit("join_room", roomId);
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

  const handleJoinRoom = () => {
    if (!socketRef.current) return;

    const trimmedRoomId = roomId.trim();

    if (trimmedRoomId.length === 0) {
      setStatusMessage("ルームIDを入力してください。");
      return;
    }

    setMessages([]);
    socketRef.current.emit("join_room", trimmedRoomId);
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
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-8">
        <header className="mb-6">
          <p className="mb-2 text-sm text-slate-400">TransChat</p>
          <h1 className="text-3xl font-bold">
            翻訳機能付きリアルタイムメッセージアプリ
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            現在はリアルタイムチャット機能の確認段階です。次の段階で翻訳機能を追加します。
          </p>
        </header>

        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
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

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleJoinRoom}
                className="w-full rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400"
              >
                ルーム参加
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
            <span className="text-slate-300">{statusMessage}</span>
          </div>
        </section>

        <section className="mb-4 flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">
              まだメッセージはありません。
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-3"
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="font-semibold text-blue-300">
                      {message.userName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <p className="whitespace-pre-wrap text-slate-100">
                    {message.originalText}
                  </p>
                  {message.translatedText && (
                    <p className="mt-2 whitespace-pre-wrap border-t border-slate-800 pt-2 text-sm text-slate-300">
                      翻訳: {message.translatedText}
                    </p>
                  )}
                </div>
              ))}
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