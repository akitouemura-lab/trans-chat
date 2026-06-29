import unittest

from app.translator import detect_language_simple


class DetectLanguageSimpleTests(unittest.TestCase):
    def test_detects_japanese(self) -> None:
        self.assertEqual(detect_language_simple("縺薙ｓ縺ｫ縺｡縺ｯ"), "ja")

    def test_detects_english(self) -> None:
        self.assertEqual(detect_language_simple("hello"), "en")

    def test_mixed_text_prefers_japanese_on_tie(self) -> None:
        self.assertEqual(detect_language_simple("hello 縺ゅｊ縺後→縺・"), "ja")

    def test_symbols_default_to_english(self) -> None:
        self.assertEqual(detect_language_simple("12345 !!!"), "en")


if __name__ == "__main__":
    unittest.main()
