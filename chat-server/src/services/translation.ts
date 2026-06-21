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
    return {
      translatedText: null,
      sourceLang,
      targetLang,
      translationMs: null,
      cacheHit: false
    };
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

  try {
    const response = await fetch(translateServiceUrl + "/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: originalText,
        source_lang: sourceLang,
        target_lang: targetLang
      })
    });

    if (!response.ok) {
      console.error("translate-service error:", response.status);

      return {
        translatedText: null,
        sourceLang,
        targetLang,
        translationMs: null,
        cacheHit: false
      };
    }

    const data = (await response.json()) as TranslateResponse;

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
    console.error("translation request failed:", error);

    return {
      translatedText: null,
      sourceLang,
      targetLang,
      translationMs: null,
      cacheHit: false
    };
  }
}