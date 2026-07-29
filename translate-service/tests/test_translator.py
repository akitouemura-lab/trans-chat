import unittest

from app.translator import (
    MissingLanguageModelError,
    detect_language_simple,
    translate_text,
)


class FakeTranslationProvider:
    name = "fake"

    def __init__(self, installed_pairs: set[tuple[str, str]] | None = None) -> None:
        self.installed_pairs = (
            installed_pairs
            if installed_pairs is not None
            else {("en", "ja"), ("ja", "en")}
        )
        self.calls: list[tuple[str, str, str]] = []

    def get_installed_pairs(self) -> set[tuple[str, str]]:
        return self.installed_pairs

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        self.calls.append((text, source_lang, target_lang))
        return "[" + source_lang + "->" + target_lang + "] " + text


class DetectLanguageSimpleTests(unittest.TestCase):
    def test_detects_japanese(self) -> None:
        self.assertEqual(detect_language_simple("こんにちは、元気ですか？"), "ja")

    def test_detects_english(self) -> None:
        self.assertEqual(detect_language_simple("hello"), "en")

    def test_mixed_text_prefers_japanese_on_tie(self) -> None:
        self.assertEqual(detect_language_simple("hello こんにちは"), "ja")

    def test_symbols_default_to_english(self) -> None:
        self.assertEqual(detect_language_simple("12345 !!!"), "en")


class TranslationProviderTests(unittest.TestCase):
    def test_uses_injected_provider_without_argos_models(self) -> None:
        provider = FakeTranslationProvider()

        result = translate_text("hello", "en", "ja", provider)

        self.assertEqual(result.translated_text, "[en->ja] hello")
        self.assertEqual(result.source_lang, "en")
        self.assertEqual(result.provider, "fake")
        self.assertGreaterEqual(result.translation_ms, 0)
        self.assertEqual(provider.calls, [("hello", "en", "ja")])

    def test_auto_detection_routes_to_provider(self) -> None:
        provider = FakeTranslationProvider()

        result = translate_text("会議は10時からです。", "auto", "en", provider)

        self.assertEqual(result.source_lang, "ja")
        self.assertEqual(
            provider.calls,
            [("会議は10時からです。", "ja", "en")],
        )

    def test_same_language_returns_original_without_provider_call(self) -> None:
        provider = FakeTranslationProvider(installed_pairs=set())

        result = translate_text("hello", "en", "en", provider)

        self.assertEqual(result.translated_text, "hello")
        self.assertEqual(result.provider, "fake")
        self.assertEqual(provider.calls, [])

    def test_missing_pair_is_reported_before_translation(self) -> None:
        provider = FakeTranslationProvider(installed_pairs={("ja", "en")})

        with self.assertRaises(MissingLanguageModelError):
            translate_text("hello", "en", "ja", provider)

        self.assertEqual(provider.calls, [])


if __name__ == "__main__":
    unittest.main()
