import unittest
from unittest.mock import Mock, patch

from fastapi import HTTPException

from app.main import health, translate
from app.schemas import TranslateRequest
from app.translator import (
    InvalidTranslationOutputError,
    TranslationResult,
    TranslationWarning,
)


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
        self.assertIsNone(response.warning)

    @patch("app.main.are_required_packages_installed", return_value=True)
    @patch("app.main.translate_text")
    def test_translate_returns_structured_warning(
        self,
        translate_text_mock: Mock,
        _packages_installed_mock: Mock,
    ) -> None:
        translate_text_mock.return_value = TranslationResult(
            translated_text="same output",
            translation_ms=4,
            source_lang="en",
            provider="fake-provider",
            warning=TranslationWarning(
                code="unchanged_output",
                message="Output matched the input.",
            ),
        )

        response = translate(
            TranslateRequest(
                text="same output",
                source_lang="en",
                target_lang="ja",
            )
        )

        self.assertIsNotNone(response.warning)
        assert response.warning is not None
        self.assertEqual(response.warning.code, "unchanged_output")
        self.assertEqual(response.warning.message, "Output matched the input.")

    @patch("app.main.are_required_packages_installed", return_value=True)
    @patch(
        "app.main.translate_text",
        side_effect=InvalidTranslationOutputError(
            "empty_output",
            "Translation provider returned empty text.",
            "",
        ),
    )
    def test_translate_returns_structured_error_for_broken_output(
        self,
        _translate_text_mock: Mock,
        _packages_installed_mock: Mock,
    ) -> None:
        with self.assertRaises(HTTPException) as context:
            translate(
                TranslateRequest(
                    text="A normal message",
                    source_lang="en",
                    target_lang="ja",
                )
            )

        self.assertEqual(context.exception.status_code, 502)
        self.assertEqual(
            context.exception.detail,
            {
                "code": "empty_output",
                "message": "Translation provider returned empty text.",
                "provider": "argos",
            },
        )

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
