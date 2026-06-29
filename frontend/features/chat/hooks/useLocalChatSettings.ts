import { useEffect, useState } from "react";
import type { TranslationDirection } from "../lib/types";
import { validateInviteToken, validateRoomId } from "../lib/validation";

const USER_NAME_KEY = "transchat-userName";
const ROOM_ID_KEY = "transchat-roomId";
const INVITE_TOKEN_KEY = "transchat-inviteToken";
const THEME_KEY = "transchat-theme";
const TRANSLATION_DIRECTION_KEY = "transchat-translationDirection";
const LEGACY_DEFAULT_ROOM_ID = "room1";

function isTranslationDirection(value: string | null): value is TranslationDirection {
  return value === "auto" || value === "en-ja" || value === "ja-en";
}

function getStoredValue(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function getUrlSearchParams(): URLSearchParams | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search);
}

function isUsableRoomId(value: string | null): value is string {
  if (!value) return false;

  const trimmedValue = value.trim();
  return (
    trimmedValue !== LEGACY_DEFAULT_ROOM_ID &&
    validateRoomId(trimmedValue) === null
  );
}

function isUsableInviteToken(value: string | null): value is string {
  if (!value) return false;
  return validateInviteToken(value.trim()) === null;
}

function getInitialUserName(): string {
  return getStoredValue(USER_NAME_KEY) ?? "user1";
}

function getInitialRoomId(): string {
  const params = getUrlSearchParams();
  const roomFromUrl = params?.get("room") ?? null;
  const inviteFromUrl = params?.get("invite") ?? null;
  const roomFromStorage = getStoredValue(ROOM_ID_KEY);

  if (isUsableRoomId(roomFromUrl)) return roomFromUrl.trim();
  if (isUsableInviteToken(inviteFromUrl)) return "";
  if (isUsableRoomId(roomFromStorage)) return roomFromStorage.trim();

  return "";
}

function getInitialInviteToken(): string {
  const params = getUrlSearchParams();
  const inviteFromUrl = params?.get("invite") ?? null;
  const inviteFromStorage = getStoredValue(INVITE_TOKEN_KEY);

  if (isUsableInviteToken(inviteFromUrl)) return inviteFromUrl.trim();
  if (isUsableInviteToken(inviteFromStorage)) return inviteFromStorage.trim();

  return "";
}

function getInitialRoomInput(): string {
  const initialRoomId = getInitialRoomId();
  const initialInviteToken = getInitialInviteToken();

  return initialRoomId || initialInviteToken;
}

function getInitialTheme(): boolean {
  return getStoredValue(THEME_KEY) !== "light";
}

function getInitialTranslationDirection(): TranslationDirection {
  const savedTranslationDirection = getStoredValue(TRANSLATION_DIRECTION_KEY);
  return isTranslationDirection(savedTranslationDirection)
    ? savedTranslationDirection
    : "auto";
}

export function useLocalChatSettings() {
  const [userName, setUserName] = useState(getInitialUserName);
  const [roomInput, setRoomInput] = useState(getInitialRoomInput);
  const [activeRoomId, setActiveRoomId] = useState(getInitialRoomId);
  const [activeInviteToken, setActiveInviteToken] = useState(
    getInitialInviteToken
  );
  const [translationDirection, setTranslationDirection] =
    useState<TranslationDirection>(getInitialTranslationDirection);
  const [isDarkMode, setIsDarkMode] = useState(getInitialTheme);

  useEffect(() => {
    window.localStorage.setItem(USER_NAME_KEY, userName);
  }, [userName]);

  useEffect(() => {
    if (activeRoomId) {
      window.localStorage.setItem(ROOM_ID_KEY, activeRoomId);
    } else {
      window.localStorage.removeItem(ROOM_ID_KEY);
    }

    if (activeInviteToken) {
      window.localStorage.setItem(INVITE_TOKEN_KEY, activeInviteToken);
    } else {
      window.localStorage.removeItem(INVITE_TOKEN_KEY);
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("room");
    nextUrl.searchParams.delete("invite");

    if (activeInviteToken) {
      nextUrl.searchParams.set("invite", activeInviteToken);
    } else if (activeRoomId) {
      nextUrl.searchParams.set("room", activeRoomId);
    }

    window.history.replaceState(null, "", nextUrl.toString());
  }, [activeInviteToken, activeRoomId]);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    window.localStorage.setItem(
      TRANSLATION_DIRECTION_KEY,
      translationDirection
    );
  }, [translationDirection]);

  return {
    userName,
    setUserName,
    roomInput,
    setRoomInput,
    activeRoomId,
    setActiveRoomId,
    activeInviteToken,
    setActiveInviteToken,
    translationDirection,
    setTranslationDirection,
    isDarkMode,
    setIsDarkMode
  };
}
