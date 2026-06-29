import type { DisplayMessage, PendingChatMessage } from "../lib/types";

function isPendingMessage(message: DisplayMessage): message is PendingChatMessage {
  return "isPending" in message && message.isPending;
}

function getMessageDirectionLabel(message: DisplayMessage): string {
  if (message.sourceLang && message.targetLang) {
    return (
      message.sourceLang.toUpperCase() +
      " -> " +
      message.targetLang.toUpperCase()
    );
  }

  return "AUTO";
}

function formatTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

type MessageBubbleProps = {
  message: DisplayMessage;
  isMine: boolean;
  isDarkMode: boolean;
  isPhraseSaved: (message: DisplayMessage) => boolean;
  onSavePhrase: (message: DisplayMessage) => boolean;
};

export function MessageBubble({
  message,
  isMine,
  isDarkMode,
  isPhraseSaved,
  onSavePhrase
}: MessageBubbleProps) {
  const canSavePhrase =
    !isPendingMessage(message) &&
    message.translationStatus === "completed" &&
    typeof message.translatedText === "string";
  const phraseSaved = canSavePhrase && isPhraseSaved(message);
  const isTranslationPending =
    !isPendingMessage(message) && message.translationStatus === "pending";
  const isTranslationFailed =
    !isPendingMessage(message) && message.translationStatus === "failed";

  return (
    <div className={isMine ? "flex justify-end" : "flex justify-start"}>
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
          <p className="text-xs opacity-70">{formatTime(message.createdAt)}</p>
        </div>

        <p className="whitespace-pre-wrap text-base">{message.originalText}</p>

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

              {isTranslationPending && (
                <span className="rounded-full bg-yellow-500/20 px-2 py-1 font-semibold text-yellow-200">
                  Translating...
                </span>
              )}

              {isTranslationFailed && (
                <span className="rounded-full bg-red-500/20 px-2 py-1 font-semibold text-red-200">
                  Translation failed
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
              : isTranslationPending
                ? "Original message was sent. Translation is still running..."
                : isTranslationFailed
                  ? message.translationError ??
                    "Original message was sent, but translation is unavailable."
                  : message.translatedText ?? "Translation unavailable."}
          </p>

          {canSavePhrase && (
            <button
              type="button"
              onClick={() => onSavePhrase(message)}
              disabled={phraseSaved}
              className="mt-3 rounded-lg border border-white/30 px-3 py-1 text-xs font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {phraseSaved ? "Saved phrase" : "Save phrase"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
