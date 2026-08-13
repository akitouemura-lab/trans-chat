export type TargetLang = "ja" | "en";
export type SourceLang = TargetLang | "auto";

type TranslateResponse = {
  translated_text: string;
  source_lang: TargetLang;
  target_lang: TargetLang;
  translation_ms: number;
  provider: string;
  warning: {
    code: TranslationOutputIssueCode;
    message: string;
  } | null;
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
  errorCode?: TranslationErrorCode;
  errorMessage?: string;
};

export type TranslationErrorCode =
  | "timeout"
  | "service_unavailable"
  | "service_error"
  | "invalid_response"
  | "missing_model"
  | TranslationOutputIssueCode;

type TranslationOutputIssueCode =
  | "empty_output"
  | "unchanged_output"
  | "suspiciously_short_output";

type CachedTranslation = {
  translatedText: string;
  sourceLang: string;
  targetLang: TargetLang;
  translationMs: number | null;
};

const MAX_CACHE_SIZE = 300;
const DEFAULT_TRANSLATE_TIMEOUT_MS = 15000;
const translationCache = new Map<string, CachedTranslation>();

export function detectTargetLang(text: string): TargetLang {
  let japaneseCount = 0;
  let englishCount = 0;

  for (const char of text) {
    if (/[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/.test(char)) {
      japaneseCount += 1;
    } else if (/[a-zA-Z]/.test(char)) {
      englishCount += 1;
    }
  }

  if (japaneseCount > englishCount) return "en";
  if (englishCount > japaneseCount) return "ja";
  if (japaneseCount > 0) return "en";

  return "ja";
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
  targetLang: TargetLang,
  errorCode: TranslationErrorCode,
  errorMessage: string
): TranslationResult {
  return {
    translatedText: null,
    sourceLang,
    targetLang,
    translationMs: null,
    cacheHit: false,
    errorCode,
    errorMessage
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

function isTranslationOutputIssueCode(
  value: unknown
): value is TranslationOutputIssueCode {
  return (
    value === "empty_output" ||
    value === "unchanged_output" ||
    value === "suspiciously_short_output"
  );
}

function isTranslationWarning(
  value: unknown
): value is TranslateResponse["warning"] {
  if (value === null) return true;
  if (typeof value !== "object") return false;

  const warning = value as Record<string, unknown>;
  return (
    isTranslationOutputIssueCode(warning.code) &&
    typeof warning.message === "string" &&
    warning.message.length > 0
  );
}

function isTranslateResponse(value: unknown): value is TranslateResponse {
  if (typeof value !== "object" || value === null) return false;

  const data = value as Record<string, unknown>;

  return (
    typeof data.translated_text === "string" &&
    isTargetLang(data.source_lang) &&
    isTargetLang(data.target_lang) &&
    typeof data.translation_ms === "number" &&
    Number.isFinite(data.translation_ms) &&
    typeof data.provider === "string" &&
    data.provider.length > 0 &&
    isTranslationWarning(data.warning)
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
    return createFallbackResult(
      sourceLang,
      targetLang,
      "invalid_response",
      "Message was empty after normalization."
    );
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

      let errorCode: TranslationErrorCode = "service_error";
      let errorMessage = "Translation service returned an error.";

      try {
        const body = (await response.json()) as { detail?: unknown };
        if (
          response.status === 503 &&
          typeof body.detail === "string" &&
          body.detail.toLowerCase().includes("model")
        ) {
          errorCode = "missing_model";
          errorMessage = "Required translation model is not installed.";
        } else if (
          response.status === 502 &&
          typeof body.detail === "object" &&
          body.detail !== null
        ) {
          const detail = body.detail as Record<string, unknown>;

          if (
            isTranslationOutputIssueCode(detail.code) &&
            typeof detail.message === "string"
          ) {
            errorCode = detail.code;
            errorMessage = detail.message;
          }
        }
      } catch {
        // Keep the generic service error.
      }

      return createFallbackResult(sourceLang, targetLang, errorCode, errorMessage);
    }

    const data: unknown = await response.json();

    if (!isTranslateResponse(data)) {
      console.error("translate-service returned an invalid response");
      return createFallbackResult(
        sourceLang,
        targetLang,
        "invalid_response",
        "Translation service returned an invalid response."
      );
    }

    if (data.warning !== null) {
      return createFallbackResult(
        data.source_lang,
        data.target_lang,
        data.warning.code,
        data.warning.message
      );
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
      return createFallbackResult(
        sourceLang,
        targetLang,
        "timeout",
        "Translation service timed out."
      );
    } else {
      console.error("translation request failed");
      return createFallbackResult(
        sourceLang,
        targetLang,
        "service_unavailable",
        "Translation service is unavailable."
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}
