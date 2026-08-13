import io
import json
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

from scripts.evaluate_translations import evaluate
from app.translator import TranslationResult, TranslationWarning


class TranslationEvaluationScriptTests(unittest.TestCase):
    @patch("scripts.evaluate_translations.get_missing_pairs", return_value=[])
    @patch(
        "scripts.evaluate_translations.translate_text",
        side_effect=RuntimeError("provider runtime failed"),
    )
    def test_reports_case_errors_without_a_traceback(
        self,
        _translate_text_mock: object,
        _get_missing_pairs_mock: object,
    ) -> None:
        output = io.StringIO()

        with redirect_stdout(output):
            exit_code = evaluate()

        report = json.loads(output.getvalue())

        self.assertEqual(exit_code, 1)
        self.assertEqual(report["failureCount"], len(report["results"]))
        self.assertFalse(report["results"][0]["success"])
        self.assertEqual(report["results"][0]["status"], "error")
        self.assertIsNone(report["results"][0]["output"])
        self.assertEqual(report["results"][0]["errorType"], "RuntimeError")
        self.assertEqual(
            report["results"][0]["errorReason"],
            "provider runtime failed",
        )

    @patch("scripts.evaluate_translations.get_missing_pairs", return_value=[])
    @patch(
        "scripts.evaluate_translations.translate_text",
        return_value=TranslationResult(
            translated_text="unchanged",
            translation_ms=1,
            source_lang="en",
            provider="fake-provider",
            warning=TranslationWarning(
                code="unchanged_output",
                message="Output matched the input.",
            ),
        ),
    )
    def test_reports_quality_warnings_with_translated_text(
        self,
        _translate_text_mock: object,
        _get_missing_pairs_mock: object,
    ) -> None:
        output = io.StringIO()

        with redirect_stdout(output):
            exit_code = evaluate()

        report = json.loads(output.getvalue())
        first_result = report["results"][0]

        self.assertEqual(exit_code, 0)
        self.assertEqual(report["warningCount"], len(report["results"]))
        self.assertFalse(first_result["success"])
        self.assertEqual(first_result["status"], "warning")
        self.assertEqual(first_result["output"], "unchanged")
        self.assertEqual(first_result["provider"], "fake-provider")
        self.assertEqual(first_result["warningCode"], "unchanged_output")
        self.assertEqual(first_result["warningReason"], "Output matched the input.")


if __name__ == "__main__":
    unittest.main()
