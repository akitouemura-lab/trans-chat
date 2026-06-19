import time
import argostranslate.package
import argostranslate.translate


SUPPORTED_PAIRS = [
    ("en", "ja"),
    ("ja", "en"),
]


def detect_language_simple(text: str) -> str:
    """Simple language detection for Japanese and English."""
    for char in text:
        if "\u3040" <= char <= "\u30ff" or "\u4e00" <= char <= "\u9fff":
            return "ja"

    return "en"


def install_language_packages() -> None:
    """Install required Argos Translate language packages if they are missing."""
    argostranslate.package.update_package_index()
    available_packages = argostranslate.package.get_available_packages()

    installed_languages = argostranslate.translate.get_installed_languages()
    installed_pairs = set()

    for source_lang in installed_languages:
        for target_lang in installed_languages:
            translation = source_lang.get_translation(target_lang)
            if translation is not None:
                installed_pairs.add((source_lang.code, target_lang.code))

    for source_code, target_code in SUPPORTED_PAIRS:
        if (source_code, target_code) in installed_pairs:
            print("Argos package already installed: " + source_code + " -> " + target_code)
            continue

        package_to_install = next(
            (
                package
                for package in available_packages
                if package.from_code == source_code and package.to_code == target_code
            ),
            None,
        )

        if package_to_install is None:
            print("No Argos package found: " + source_code + " -> " + target_code)
            continue

        print("Installing Argos package: " + source_code + " -> " + target_code)
        download_path = package_to_install.download()
        argostranslate.package.install_from_path(download_path)


def translate_text(text: str, source_lang: str, target_lang: str) -> tuple[str, int, str]:
    """Translate text and return translated text, elapsed milliseconds, and detected source language."""
    start_time = time.perf_counter()

    actual_source_lang = source_lang
    if actual_source_lang == "auto":
        actual_source_lang = detect_language_simple(text)

    translated_text = argostranslate.translate.translate(
        text,
        actual_source_lang,
        target_lang,
    )

    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
    return translated_text, elapsed_ms, actual_source_lang