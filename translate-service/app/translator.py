import time

import argostranslate.translate


SUPPORTED_PAIRS = [
    ("en", "ja"),
    ("ja", "en"),
]


class MissingLanguageModelError(RuntimeError):
    pass


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


def get_installed_pairs() -> set[tuple[str, str]]:
    installed_languages = argostranslate.translate.get_installed_languages()
    installed_pairs: set[tuple[str, str]] = set()

    for source_lang in installed_languages:
        for target_lang in installed_languages:
            translation = source_lang.get_translation(target_lang)
            if translation is not None:
                installed_pairs.add((source_lang.code, target_lang.code))

    return installed_pairs


def get_missing_pairs() -> list[tuple[str, str]]:
    installed_pairs = get_installed_pairs()
    return [pair for pair in SUPPORTED_PAIRS if pair not in installed_pairs]


def are_required_packages_installed() -> bool:
    return len(get_missing_pairs()) == 0


def ensure_translation_pair_installed(source_lang: str, target_lang: str) -> None:
    if source_lang == target_lang:
        return

    if (source_lang, target_lang) not in get_installed_pairs():
        raise MissingLanguageModelError(
            "Missing Argos model for " + source_lang + " -> " + target_lang
        )


def translate_text(text: str, source_lang: str, target_lang: str) -> tuple[str, int, str]:
    """Translate text and return translated text, elapsed milliseconds, and source language."""
    start_time = time.perf_counter()

    actual_source_lang = source_lang
    if actual_source_lang == "auto":
        actual_source_lang = detect_language_simple(text)

    if actual_source_lang == target_lang:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        return text, elapsed_ms, actual_source_lang

    ensure_translation_pair_installed(actual_source_lang, target_lang)

    translated_text = argostranslate.translate.translate(
        text,
        actual_source_lang,
        target_lang,
    )

    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
    return translated_text, elapsed_ms, actual_source_lang
