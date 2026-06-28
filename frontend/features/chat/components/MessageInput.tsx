import type { Dispatch, FormEvent, SetStateAction } from "react";

type MessageInputProps = {
  text: string;
  activeRoomId: string;
  isConnected: boolean;
  isSending: boolean;
  isDarkMode: boolean;
  inputClass: string;
  mutedTextClass: string;
  onTextChange: Dispatch<SetStateAction<string>>;
  onSendMessage: (text: string) => boolean;
};

export function MessageInput({
  text,
  activeRoomId,
  isConnected,
  isSending,
  isDarkMode,
  inputClass,
  mutedTextClass,
  onTextChange,
  onSendMessage
}: MessageInputProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (onSendMessage(text)) {
      onTextChange("");
    }
  }

  return (
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
          onChange={(event) => onTextChange(event.target.value)}
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
        <span>{text.length}/1000 characters</span>
        <span>Current room: {activeRoomId}</span>
      </div>
    </form>
  );
}
