type TranslateResponse = {
  translated_text: string;
  source_lang: string;
  target_lang: string;
  translation_ms: number;
};

function detectTargetLang(text: string): "ja" | "en" {
  const hasJapanese = /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
  return hasJapanese ? "en" : "ja";
}

export async function translateMessage(text: string): Promise<{
  translatedText: string | null;
  sourceLang: string;
  targetLang: string;
  translationMs: number | null;
}> {
  const translateServiceUrl =
    process.env.TRANSLATE_SERVICE_URL ?? "http://localhost:5000";

  const targetLang = detectTargetLang(text);

  try {
    const response = await fetch(translateServiceUrl + "/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        source_lang: "auto",
        target_lang: targetLang
      })
    });

    if (!response.ok) {
      console.error("translate-service error:", response.status);
      return {
        translatedText: null,
        sourceLang: "auto",
        targetLang,
        translationMs: null
      };
    }

    const data = (await response.json()) as TranslateResponse;

    return {
      translatedText: data.translated_text,
      sourceLang: data.source_lang,
      targetLang: data.target_lang,
      translationMs: data.translation_ms
    };
  } catch (error) {
    console.error("translation request failed:", error);

    return {
      translatedText: null,
      sourceLang: "auto",
      targetLang,
      translationMs: null
    };
  }
}