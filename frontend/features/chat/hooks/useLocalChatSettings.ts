import { useEffect, useState } from "react";
import type { TranslationDirection } from "../lib/types";

const USER_NAME_KEY = "transchat-userName";
const ROOM_ID_KEY = "transchat-roomId";
const THEME_KEY = "transchat-theme";
const TRANSLATION_DIRECTION_KEY = "transchat-translationDirection";

function isTranslationDirection(value: string | null): value is TranslationDirection {
  return value === "auto" || value === "en-ja" || value === "ja-en";
}

function getStoredValue(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function getInitialUserName(): string {
  return getStoredValue(USER_NAME_KEY) ?? "user1";
}

function getInitialRoomId(): string {
  return getStoredValue(ROOM_ID_KEY) ?? "room1";
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
  const [roomInput, setRoomInput] = useState(getInitialRoomId);
  const [activeRoomId, setActiveRoomId] = useState(getInitialRoomId);
  const [translationDirection, setTranslationDirection] =
    useState<TranslationDirection>(getInitialTranslationDirection);
  const [isDarkMode, setIsDarkMode] = useState(getInitialTheme);

  useEffect(() => {
    window.localStorage.setItem(USER_NAME_KEY, userName);
  }, [userName]);

  useEffect(() => {
    window.localStorage.setItem(ROOM_ID_KEY, activeRoomId);
  }, [activeRoomId]);

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
    translationDirection,
    setTranslationDirection,
    isDarkMode,
    setIsDarkMode
  };
}
