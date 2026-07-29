import unittest
from unittest.mock import Mock, patch

from fastapi import HTTPException

from app.main import health, translate
from app.schemas import TranslateRequest
from app.translator import TranslationResult


class TranslateServiceTests(unittest.TestCase):
    @patch("app.main.get_missing_pairs", return_value=[])
    def test_health_reports_default_provider(self, _get_missing_pairs: Mock) -> None:
        response = health()

        self.assertEqual(response["status"], "ok")
        self.assertEqual(response["provider"], "argos")
        self.assertTrue(response["modelsReady"])

    @patch("app.main.are_required_packages_installed", return_value=True)
    @patch("app.main.translate_text")
    def test_translate_returns_provider_metadata_without_loading_models(
        self,
        translate_text_mock: Mock,
        _packages_installed_mock: Mock,
    ) -> None:
        translate_text_mock.return_value = TranslationResult(
            translated_text="テスト結果",
            translation_ms=12,
            source_lang="en",
            provider="fake-provider",
        )

        response = translate(
            TranslateRequest(
                text="test input",
                source_lang="en",
                target_lang="ja",
            )
        )

        self.assertEqual(response.translated_text, "テスト結果")
        self.assertEqual(response.source_lang, "en")
        self.assertEqual(response.target_lang, "ja")
        self.assertEqual(response.translation_ms, 12)
        self.assertEqual(response.provider, "fake-provider")

    @patch("app.main.are_required_packages_installed", return_value=False)
    def test_translate_reports_missing_models(
        self,
        _packages_installed_mock: Mock,
    ) -> None:
        with self.assertRaises(HTTPException) as context:
            translate(
                TranslateRequest(
                    text="hello",
                    source_lang="en",
                    target_lang="ja",
                )
            )

        self.assertEqual(context.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
