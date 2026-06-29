import { useCallback, useMemo, useState } from "react";

function createInviteLink(inviteToken: string): string {
  if (typeof window === "undefined") return "";
  if (!inviteToken) return "";

  const url = new URL(window.location.href);
  url.searchParams.delete("room");
  url.searchParams.set("invite", inviteToken);
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

export function useRoomInviteLink(activeInviteToken: string) {
  const [copyState, setCopyState] = useState<{
    inviteToken: string;
    message: string;
  } | null>(null);
  const inviteLink = useMemo(
    () => createInviteLink(activeInviteToken),
    [activeInviteToken]
  );
  const inviteStatusMessage =
    copyState?.inviteToken === activeInviteToken ? copyState.message : "";

  const copyInviteLink = useCallback(async () => {
    const nextInviteLink = createInviteLink(activeInviteToken);

    if (!nextInviteLink) {
      setCopyState({
        inviteToken: activeInviteToken,
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
        inviteToken: activeInviteToken,
        message: "Invite link copied."
      });
    } catch {
      setCopyState({
        inviteToken: activeInviteToken,
        message: "Could not copy invite link."
      });
    }
  }, [activeInviteToken]);

  return {
    inviteLink,
    inviteStatusMessage,
    copyInviteLink
  };
}
