export type TargetLang = "ja" | "en";
export type SourceLang = TargetLang | "auto";

type TranslateResponse = {
  translated_text: string;
  source_lang: string;
  target_lang: TargetLang;
  translation_ms: number;
};

type TranslateOptions = {
  sourceLang?: SourceLang;
  targetLang?: TargetLang;
};

export type TranslationResult = {
  translatedText: string | null;
  sourceLang: string;
  targetLang: TargetLang;
  translationMs: number | null;
  cacheHit: boolean;
};

type CachedTranslation = {
  translatedText: string;
  sourceLang: string;
  targetLang: TargetLang;
  translationMs: number | null;
};

const MAX_CACHE_SIZE = 300;
const DEFAULT_TRANSLATE_TIMEOUT_MS = 5000;
const translationCache = new Map<string, CachedTranslation>();

export function detectTargetLang(text: string): TargetLang {
  const hasJapanese = /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
  return hasJapanese ? "en" : "ja";
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function createCacheKey(text: string, sourceLang: SourceLang, targetLang: TargetLang): string {
  return sourceLang + ":" + targetLang + ":" + normalizeText(text).toLowerCase();
}

function saveToCache(key: string, value: CachedTranslation): void {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = translationCache.keys().next().value;
    if (oldestKey) {
      translationCache.delete(oldestKey);
    }
  }

  translationCache.set(key, value);
}

function createFallbackResult(
  sourceLang: SourceLang,
  targetLang: TargetLang
): TranslationResult {
  return {
    translatedText: null,
    sourceLang,
    targetLang,
    translationMs: null,
    cacheHit: false
  };
}

function getTranslateTimeoutMs(): number {
  const configured = Number(process.env.TRANSLATE_TIMEOUT_MS);

  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return DEFAULT_TRANSLATE_TIMEOUT_MS;
}

function isTargetLang(value: unknown): value is TargetLang {
  return value === "ja" || value === "en";
}

function isTranslateResponse(value: unknown): value is TranslateResponse {
  if (typeof value !== "object" || value === null) return false;

  const data = value as Record<string, unknown>;

  return (
    typeof data.translated_text === "string" &&
    typeof data.source_lang === "string" &&
    isTargetLang(data.target_lang) &&
    typeof data.translation_ms === "number" &&
    Number.isFinite(data.translation_ms)
  );
}

export function getTranslationCacheSize(): number {
  return translationCache.size;
}

export function clearTranslationCache(): void {
  translationCache.clear();
}

export async function translateMessage(
  text: string,
  options: TranslateOptions = {}
): Promise<TranslationResult> {
  const translateServiceUrl =
    process.env.TRANSLATE_SERVICE_URL ?? "http://localhost:5000";

  const originalText = normalizeText(text);
  const targetLang = options.targetLang ?? detectTargetLang(originalText);
  const sourceLang = options.sourceLang ?? "auto";

  if (originalText.length === 0) {
    return createFallbackResult(sourceLang, targetLang);
  }

  if (sourceLang !== "auto" && sourceLang === targetLang) {
    return {
      translatedText: originalText,
      sourceLang,
      targetLang,
      translationMs: 0,
      cacheHit: false
    };
  }

  const cacheKey = createCacheKey(originalText, sourceLang, targetLang);
  const cached = translationCache.get(cacheKey);

  if (cached) {
    return {
      ...cached,
      translationMs: 0,
      cacheHit: true
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, getTranslateTimeoutMs());

  try {
    const response = await fetch(translateServiceUrl + "/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        text: originalText,
        source_lang: sourceLang,
        target_lang: targetLang
      })
    });

    if (!response.ok) {
      console.error("translate-service error:", response.status);

      return createFallbackResult(sourceLang, targetLang);
    }

    const data: unknown = await response.json();

    if (!isTranslateResponse(data)) {
      console.error("translate-service returned an invalid response");
      return createFallbackResult(sourceLang, targetLang);
    }

    const result: CachedTranslation = {
      translatedText: data.translated_text,
      sourceLang: data.source_lang,
      targetLang: data.target_lang,
      translationMs: data.translation_ms
    };

    if (result.translatedText.trim().length > 0) {
      saveToCache(cacheKey, result);
    }

    return {
      ...result,
      cacheHit: false
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("translation request timed out");
    } else {
      console.error("translation request failed");
    }

    return createFallbackResult(sourceLang, targetLang);
  } finally {
    clearTimeout(timeout);
  }
}
