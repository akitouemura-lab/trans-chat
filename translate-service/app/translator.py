import time
from dataclasses import dataclass
from typing import Literal, Protocol

import argostranslate.translate


SUPPORTED_PAIRS = [
    ("en", "ja"),
    ("ja", "en"),
]
MIN_NON_TRIVIAL_INPUT_LENGTH = 12
MAX_SUSPICIOUS_OUTPUT_LENGTH = 3


class MissingLanguageModelError(RuntimeError):
    pass


TranslationWarningCode = Literal[
    "unchanged_output",
    "suspiciously_short_output",
]
TranslationIssueCode = Literal[
    "empty_output",
    "unchanged_output",
    "suspiciously_short_output",
]


@dataclass(frozen=True)
class TranslationWarning:
    code: TranslationWarningCode
    message: str


class InvalidTranslationOutputError(RuntimeError):
    def __init__(
        self,
        code: TranslationIssueCode,
        message: str,
        translated_text: str,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.translated_text = translated_text


class TranslationProvider(Protocol):
    name: str

    def get_installed_pairs(self) -> set[tuple[str, str]]:
        ...

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        ...


class ArgosTranslationProvider:
    name = "argos"

    def get_installed_pairs(self) -> set[tuple[str, str]]:
        installed_languages = argostranslate.translate.get_installed_languages()
        installed_pairs: set[tuple[str, str]] = set()

        for source_lang in installed_languages:
            for target_lang in installed_languages:
                translation = source_lang.get_translation(target_lang)
                if translation is not None:
                    installed_pairs.add((source_lang.code, target_lang.code))

        return installed_pairs

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        return argostranslate.translate.translate(
            text,
            source_lang,
            target_lang,
        )


@dataclass(frozen=True)
class TranslationResult:
    translated_text: str
    translation_ms: int
    source_lang: str
    provider: str
    warning: TranslationWarning | None = None


DEFAULT_TRANSLATION_PROVIDER: TranslationProvider = ArgosTranslationProvider()


def detect_language_simple(text: str) -> str:
    """Lightweight Japanese/English detection tuned for short chat messages."""
    japanese_count = 0
    english_count = 0

    for char in text:
        if (
            "\u3040" <= char <= "\u30ff"
            or "\u3400" <= char <= "\u9fff"
            or "\uff66" <= char <= "\uff9f"
        ):
            japanese_count += 1
        elif ("a" <= char <= "z") or ("A" <= char <= "Z"):
            english_count += 1

    if japanese_count > english_count:
        return "ja"

    if english_count > japanese_count:
        return "en"

    if japanese_count > 0:
        return "ja"

    return "en"


def get_installed_pairs(
    provider: TranslationProvider = DEFAULT_TRANSLATION_PROVIDER,
) -> set[tuple[str, str]]:
    return provider.get_installed_pairs()


def get_missing_pairs(
    provider: TranslationProvider = DEFAULT_TRANSLATION_PROVIDER,
) -> list[tuple[str, str]]:
    installed_pairs = get_installed_pairs(provider)
    return [pair for pair in SUPPORTED_PAIRS if pair not in installed_pairs]


def are_required_packages_installed(
    provider: TranslationProvider = DEFAULT_TRANSLATION_PROVIDER,
) -> bool:
    return len(get_missing_pairs(provider)) == 0


def ensure_translation_pair_installed(
    source_lang: str,
    target_lang: str,
    provider: TranslationProvider = DEFAULT_TRANSLATION_PROVIDER,
) -> None:
    if source_lang == target_lang:
        return

    if (source_lang, target_lang) not in get_installed_pairs(provider):
        raise MissingLanguageModelError(
            "Missing translation model for " + source_lang + " -> " + target_lang
        )


def _normalize_for_comparison(text: str) -> str:
    return " ".join(text.split()).casefold()


def _content_length(text: str) -> int:
    return sum(1 for char in text if char.isalnum())


def validate_translation_output(
    input_text: str,
    translated_text: str,
    source_lang: str,
    target_lang: str,
) -> TranslationWarning | None:
    """Reject broken output and flag conservative quality warning signals."""
    if not translated_text.strip():
        raise InvalidTranslationOutputError(
            "empty_output",
            "Translation provider returned empty text.",
            translated_text,
        )

    if source_lang == target_lang:
        return None

    if _normalize_for_comparison(input_text) == _normalize_for_comparison(
        translated_text
    ):
        return TranslationWarning(
            code="unchanged_output",
            message=(
                "Translation output matches the input although the source and "
                "target languages differ."
            ),
        )

    input_length = _content_length(input_text)
    output_length = _content_length(translated_text)

    if (
        input_length >= MIN_NON_TRIVIAL_INPUT_LENGTH
        and output_length <= MAX_SUSPICIOUS_OUTPUT_LENGTH
    ):
        return TranslationWarning(
            code="suspiciously_short_output",
            message="Translation output is unusually short compared with the input.",
        )

    return None


def translate_text(
    text: str,
    source_lang: str,
    target_lang: str,
    provider: TranslationProvider = DEFAULT_TRANSLATION_PROVIDER,
) -> TranslationResult:
    """Translate text and return output plus routing and provider metadata."""
    start_time = time.perf_counter()

    actual_source_lang = source_lang
    if actual_source_lang == "auto":
        actual_source_lang = detect_language_simple(text)

    if actual_source_lang == target_lang:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        return TranslationResult(
            translated_text=text,
            translation_ms=elapsed_ms,
            source_lang=actual_source_lang,
            provider=provider.name,
        )

    ensure_translation_pair_installed(
        actual_source_lang,
        target_lang,
        provider,
    )

    translated_text = provider.translate(
        text,
        actual_source_lang,
        target_lang,
    )
    warning = validate_translation_output(
        text,
        translated_text,
        actual_source_lang,
        target_lang,
    )

    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
    return TranslationResult(
        translated_text=translated_text,
        translation_ms=elapsed_ms,
        source_lang=actual_source_lang,
        provider=provider.name,
        warning=warning,
    )
