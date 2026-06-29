import { useEffect, useRef } from "react";
import type { DisplayMessage } from "../lib/types";
import { MessageBubble } from "./MessageBubble";

type MessageListProps = {
  messages: DisplayMessage[];
  userName: string;
  activeRoomId: string;
  isDarkMode: boolean;
  panelClass: string;
  mutedTextClass: string;
  isPhraseSaved: (message: DisplayMessage) => boolean;
  onSavePhrase: (message: DisplayMessage) => boolean;
};

export function MessageList({
  messages,
  userName,
  activeRoomId,
  isDarkMode,
  panelClass,
  mutedTextClass,
  isPhraseSaved,
  onSavePhrase
}: MessageListProps) {
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const hasActiveRoom = activeRoomId.trim().length > 0;

  return (
    <section
      className={
        "mb-4 flex-1 overflow-y-auto rounded-2xl border p-4 pb-28 shadow-xl " +
        panelClass
      }
    >
      {messages.length === 0 ? (
        <div className="flex min-h-80 items-center justify-center">
          <p className={"text-sm " + mutedTextClass}>
            {hasActiveRoom
              ? "No messages yet. Send your first translated message."
              : "Create a room or join with an invite to start chatting."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isMine={message.userName === userName.trim()}
              isDarkMode={isDarkMode}
              isPhraseSaved={isPhraseSaved}
              onSavePhrase={onSavePhrase}
            />
          ))}
        </div>
      )}
      <div ref={bottomAnchorRef} />
    </section>
  );
}
