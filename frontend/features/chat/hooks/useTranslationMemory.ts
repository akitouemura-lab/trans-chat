import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DisplayMessage,
  SavedPhrase,
  TranslationMemoryItem
} from "../lib/types";

const HISTORY_KEY = "transchat-translationHistory";
const SAVED_PHRASES_KEY = "transchat-savedPhrases";
const HISTORY_LIMIT = 50;
const SAVED_PHRASE_LIMIT = 30;

type PhraseCandidate = {
  originalText: string;
  translatedText: string;
  sourceLang: string | null;
  targetLang: string | null;
};

function isPendingMessage(message: DisplayMessage): boolean {
  return "isPending" in message && message.isPending;
}

function isRecordableMessage(
  message: DisplayMessage
): message is DisplayMessage & { translatedText: string } {
  return !isPendingMessage(message) && typeof message.translatedText === "string";
}

function readJsonArray<T>(
  key: string,
  isValidItem: (value: unknown) => value is T
): T[] {
  if (typeof window === "undefined") return [];

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsedValue)) return [];

    return parsedValue.filter(isValidItem);
  } catch {
    return [];
  }
}

function writeJsonArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function isTranslationMemoryItem(
  value: unknown
): value is TranslationMemoryItem {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.messageId === "string" &&
    typeof item.roomId === "string" &&
    typeof item.userName === "string" &&
    typeof item.originalText === "string" &&
    typeof item.translatedText === "string" &&
    typeof item.createdAt === "string"
  );
}

function isSavedPhrase(value: unknown): value is SavedPhrase {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.originalText === "string" &&
    typeof item.translatedText === "string" &&
    typeof item.createdAt === "string" &&
    (typeof item.lastUsedAt === "string" || item.lastUsedAt === null) &&
    typeof item.useCount === "number"
  );
}

function getPhraseKey(candidate: PhraseCandidate): string {
  return [
    candidate.originalText.trim().toLowerCase(),
    candidate.translatedText.trim().toLowerCase(),
    candidate.sourceLang ?? "",
    candidate.targetLang ?? ""
  ].join("::");
}

function createPhraseCandidate(
  item: DisplayMessage | TranslationMemoryItem
): PhraseCandidate | null {
  if (!item.translatedText) return null;

  return {
    originalText: item.originalText.trim(),
    translatedText: item.translatedText.trim(),
    sourceLang: item.sourceLang,
    targetLang: item.targetLang
  };
}

function createHistoryItem(message: DisplayMessage): TranslationMemoryItem | null {
  if (!isRecordableMessage(message)) return null;

  return {
    id: "history-" + message.id,
    messageId: message.id,
    roomId: message.roomId,
    userName: message.userName,
    originalText: message.originalText,
    translatedText: message.translatedText,
    sourceLang: message.sourceLang,
    targetLang: message.targetLang,
    createdAt: message.createdAt
  };
}

export function useTranslationMemory() {
  const [history, setHistory] = useState<TranslationMemoryItem[]>(() =>
    readJsonArray(HISTORY_KEY, isTranslationMemoryItem)
  );
  const [savedPhrases, setSavedPhrases] = useState<SavedPhrase[]>(() =>
    readJsonArray(SAVED_PHRASES_KEY, isSavedPhrase)
  );

  useEffect(() => {
    writeJsonArray(HISTORY_KEY, history);
  }, [history]);

  useEffect(() => {
    writeJsonArray(SAVED_PHRASES_KEY, savedPhrases);
  }, [savedPhrases]);

  const recordMessages = useCallback((messages: DisplayMessage[]) => {
    setHistory((currentHistory) => {
      const newHistoryItems = messages
        .map(createHistoryItem)
        .filter((item): item is TranslationMemoryItem => item !== null)
        .reverse();

      if (newHistoryItems.length === 0) return currentHistory;

      const existingMessageIds = new Set(
        currentHistory.map((item) => item.messageId)
      );
      const uniqueNewItems = newHistoryItems.filter(
        (item) => !existingMessageIds.has(item.messageId)
      );

      if (uniqueNewItems.length === 0) return currentHistory;

      return [...uniqueNewItems, ...currentHistory].slice(0, HISTORY_LIMIT);
    });
  }, []);

  const savedPhraseKeys = useMemo(
    () => new Set(savedPhrases.map(getPhraseKey)),
    [savedPhrases]
  );

  const isPhraseSaved = useCallback(
    (item: DisplayMessage | TranslationMemoryItem): boolean => {
      const candidate = createPhraseCandidate(item);
      if (!candidate) return false;

      return savedPhraseKeys.has(getPhraseKey(candidate));
    },
    [savedPhraseKeys]
  );

  const savePhrase = useCallback(
    (item: DisplayMessage | TranslationMemoryItem): boolean => {
      const candidate = createPhraseCandidate(item);
      if (!candidate) return false;

      const candidateKey = getPhraseKey(candidate);
      const now = new Date().toISOString();

      setSavedPhrases((currentPhrases) => {
        const existingPhrase = currentPhrases.find(
          (phrase) => getPhraseKey(phrase) === candidateKey
        );

        if (existingPhrase) {
          return [
            existingPhrase,
            ...currentPhrases.filter((phrase) => phrase.id !== existingPhrase.id)
          ];
        }

        const newPhrase: SavedPhrase = {
          id:
            "phrase-" +
            Date.now().toString() +
            "-" +
            Math.random().toString(36).slice(2),
          ...candidate,
          createdAt: now,
          lastUsedAt: null,
          useCount: 0
        };

        return [newPhrase, ...currentPhrases].slice(0, SAVED_PHRASE_LIMIT);
      });

      return true;
    },
    []
  );

  const removeSavedPhrase = useCallback((phraseId: string) => {
    setSavedPhrases((currentPhrases) =>
      currentPhrases.filter((phrase) => phrase.id !== phraseId)
    );
  }, []);

  const markPhraseUsed = useCallback((phraseId: string) => {
    setSavedPhrases((currentPhrases) => {
      const phrase = currentPhrases.find((item) => item.id === phraseId);
      if (!phrase) return currentPhrases;

      const updatedPhrase: SavedPhrase = {
        ...phrase,
        lastUsedAt: new Date().toISOString(),
        useCount: phrase.useCount + 1
      };

      return [
        updatedPhrase,
        ...currentPhrases.filter((item) => item.id !== phraseId)
      ];
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const clearSavedPhrases = useCallback(() => {
    setSavedPhrases([]);
  }, []);

  return {
    history,
    savedPhrases,
    recordMessages,
    isPhraseSaved,
    savePhrase,
    removeSavedPhrase,
    markPhraseUsed,
    clearHistory,
    clearSavedPhrases
  };
}
