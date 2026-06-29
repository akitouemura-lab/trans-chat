import type { Dispatch, SetStateAction } from "react";
import type { TranslationDirection } from "../lib/types";

type RoomControlsProps = {
  userName: string;
  roomInput: string;
  activeRoomId: string;
  translationDirection: TranslationDirection;
  inviteLink: string;
  inviteStatusMessage: string;
  isConnected: boolean;
  isLoadingHistory: boolean;
  isDeletingHistory: boolean;
  statusMessage: string;
  panelClass: string;
  mutedTextClass: string;
  inputClass: string;
  onUserNameChange: Dispatch<SetStateAction<string>>;
  onRoomInputChange: Dispatch<SetStateAction<string>>;
  onTranslationDirectionChange: Dispatch<SetStateAction<TranslationDirection>>;
  onJoinRoom: () => void;
  onCreateRoom: () => void;
  onCopyInviteLink: () => void;
  onDeleteHistory: () => void;
};

export function RoomControls({
  userName,
  roomInput,
  activeRoomId,
  translationDirection,
  inviteLink,
  inviteStatusMessage,
  isConnected,
  isLoadingHistory,
  isDeletingHistory,
  statusMessage,
  panelClass,
  mutedTextClass,
  inputClass,
  onUserNameChange,
  onRoomInputChange,
  onTranslationDirectionChange,
  onJoinRoom,
  onCreateRoom,
  onCopyInviteLink,
  onDeleteHistory
}: RoomControlsProps) {
  const visibleStatusMessage = inviteStatusMessage
    ? inviteStatusMessage
    : isLoadingHistory
      ? "Loading room history..."
      : statusMessage;
  const canJoinRoom = roomInput.trim().length > 0 && !isLoadingHistory;
  const hasActiveRoom = activeRoomId.trim().length > 0;

  return (
    <section className={"mb-4 rounded-2xl border p-4 shadow-xl " + panelClass}>
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto_auto]">
        <label className="flex flex-col gap-1">
          <span className={"text-sm " + mutedTextClass}>User name</span>
          <input
            className={"rounded-lg border px-3 py-2 outline-none " + inputClass}
            value={userName}
            maxLength={30}
            onChange={(event) => onUserNameChange(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={"text-sm " + mutedTextClass}>
            Room ID / invite token
          </span>
          <input
            className={"rounded-lg border px-3 py-2 outline-none " + inputClass}
            value={roomInput}
            maxLength={128}
            placeholder="Create a room or paste an invite token"
            onChange={(event) => onRoomInputChange(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={"text-sm " + mutedTextClass}>Translation</span>
          <select
            className={"rounded-lg border px-3 py-2 outline-none " + inputClass}
            value={translationDirection}
            onChange={(event) =>
              onTranslationDirectionChange(
                event.target.value as TranslationDirection
              )
            }
          >
            <option value="auto">Auto detect</option>
            <option value="en-ja">English -&gt; Japanese</option>
            <option value="ja-en">Japanese -&gt; English</option>
          </select>
        </label>

        <button
          type="button"
          onClick={onJoinRoom}
          disabled={!isConnected || !canJoinRoom}
          className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          {isLoadingHistory ? "Joining..." : "Join room"}
        </button>

        <button
          type="button"
          onClick={onCreateRoom}
          disabled={!isConnected || isLoadingHistory}
          className="rounded-lg border border-blue-500 px-4 py-2 font-semibold text-blue-400 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:border-slate-500 disabled:text-slate-500"
        >
          Create
        </button>

        <button
          type="button"
          onClick={onCopyInviteLink}
          disabled={!inviteLink}
          title={inviteLink}
          className="rounded-lg border border-emerald-500 px-4 py-2 font-semibold text-emerald-400 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:border-slate-500 disabled:text-slate-500"
        >
          Copy invite
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
            {visibleStatusMessage}
          </span>
        </div>

        <button
          type="button"
          onClick={onDeleteHistory}
          disabled={!hasActiveRoom || isDeletingHistory}
          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-red-900"
        >
          {isDeletingHistory ? "Deleting..." : "Delete room history"}
        </button>
      </div>
    </section>
  );
}
