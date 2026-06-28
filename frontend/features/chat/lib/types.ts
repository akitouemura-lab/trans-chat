export type TranslationDirection = "auto" | "en-ja" | "ja-en";

export type ChatMessage = {
  id: string;
  roomId: string;
  userName: string;
  originalText: string;
  translatedText: string | null;
  sourceLang: string | null;
  targetLang: string | null;
  translationMs: number | null;
  cacheHit?: boolean;
  clientMessageId?: string;
  createdAt: string;
};

export type PendingChatMessage = {
  id: string;
  clientMessageId: string;
  roomId: string;
  userName: string;
  originalText: string;
  translatedText: null;
  sourceLang: string | null;
  targetLang: string | null;
  translationMs: null;
  cacheHit?: boolean;
  createdAt: string;
  isPending: true;
  status: "sending" | "translating" | "error";
};

export type DisplayMessage = ChatMessage | PendingChatMessage;

export type MessageStatusPayload = {
  clientMessageId: string;
  status: "translating" | "saved" | "error";
  message?: string;
};

export type TranslationMemoryItem = {
  id: string;
  messageId: string;
  roomId: string;
  userName: string;
  originalText: string;
  translatedText: string;
  sourceLang: string | null;
  targetLang: string | null;
  createdAt: string;
};

export type SavedPhrase = {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: string | null;
  targetLang: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  useCount: number;
};
