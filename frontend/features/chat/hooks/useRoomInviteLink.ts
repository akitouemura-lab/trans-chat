import { useCallback, useMemo, useState } from "react";

function createInviteLink(roomId: string): string {
  if (typeof window === "undefined") return "";

  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  url.hash = "";

  return url.toString();
}

function copyTextWithFallback(text: string): boolean {
  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  return copied;
}

export function useRoomInviteLink(activeRoomId: string) {
  const [copyState, setCopyState] = useState<{
    roomId: string;
    message: string;
  } | null>(null);
  const inviteLink = useMemo(() => createInviteLink(activeRoomId), [activeRoomId]);
  const inviteStatusMessage =
    copyState?.roomId === activeRoomId ? copyState.message : "";

  const copyInviteLink = useCallback(async () => {
    const nextInviteLink = createInviteLink(activeRoomId);

    if (!nextInviteLink) {
      setCopyState({
        roomId: activeRoomId,
        message: "Invite link is not available."
      });
      return;
    }

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(nextInviteLink);
      } else if (!copyTextWithFallback(nextInviteLink)) {
        throw new Error("copy failed");
      }

      setCopyState({
        roomId: activeRoomId,
        message: "Invite link copied."
      });
    } catch {
      setCopyState({
        roomId: activeRoomId,
        message: "Could not copy invite link."
      });
    }
  }, [activeRoomId]);

  return {
    inviteLink,
    inviteStatusMessage,
    copyInviteLink
  };
}
