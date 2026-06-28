import type { TranslationDirection } from "../lib/types";

function getDirectionLabel(direction: TranslationDirection): string {
  if (direction === "en-ja") return "EN -> JA";
  if (direction === "ja-en") return "JA -> EN";
  return "AUTO";
}

type ChatHeaderProps = {
  activeRoomId: string;
  userName: string;
  isConnected: boolean;
  translationDirection: TranslationDirection;
  isDarkMode: boolean;
  panelClass: string;
  mutedTextClass: string;
  onToggleTheme: () => void;
};

export function ChatHeader({
  activeRoomId,
  userName,
  isConnected,
  translationDirection,
  isDarkMode,
  panelClass,
  mutedTextClass,
  onToggleTheme
}: ChatHeaderProps) {
  return (
    <header
      className={
        "sticky top-0 z-20 mb-4 rounded-2xl border p-4 shadow-xl backdrop-blur " +
        panelClass
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-400">TransChat</p>
          <h1 className="text-2xl font-bold md:text-3xl">
            Real-time Translation Chat
          </h1>
          <p className={"mt-1 text-sm " + mutedTextClass}>
            Room: <span className="font-semibold">{activeRoomId}</span> / User:{" "}
            <span className="font-semibold">
              {userName.trim() || "No name"}
            </span>
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
            onClick={onToggleTheme}
            className="rounded-full border border-slate-500/40 px-3 py-1 text-sm hover:bg-slate-500/10"
          >
            {isDarkMode ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </div>
    </header>
  );
}
