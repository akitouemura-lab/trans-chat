import io
import json
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

from scripts.evaluate_translations import evaluate


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
        self.assertEqual(report["results"][0]["errorType"], "RuntimeError")
        self.assertEqual(
            report["results"][0]["error"],
            "provider runtime failed",
        )


if __name__ == "__main__":
    unittest.main()
