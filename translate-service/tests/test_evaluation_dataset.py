import json
import unittest
from pathlib import Path
from typing import Any

from app.translator import translate_text


DATASET_PATH = (
    Path(__file__).resolve().parents[1] / "evaluation" / "chat_phrases.json"
)
REQUIRED_CATEGORIES = {
    "everyday",
    "polite",
    "short",
    "names",
    "times",
    "mixed",
}


class RecordingProvider:
    name = "evaluation-fake"

    def __init__(self) -> None:
        self.calls: list[tuple[str, str, str]] = []

    def get_installed_pairs(self) -> set[tuple[str, str]]:
        return {("en", "ja"), ("ja", "en")}

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        self.calls.append((text, source_lang, target_lang))
        return "translated:" + text


def load_cases() -> list[dict[str, Any]]:
    dataset = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    return dataset["cases"]


class TranslationEvaluationDatasetTests(unittest.TestCase):
    def test_dataset_has_required_chat_categories_and_directions(self) -> None:
        cases = load_cases()
        categories = {case["category"] for case in cases}
        directions = {
            (case["expected_source_lang"], case["target_lang"]) for case in cases
        }

        self.assertTrue(REQUIRED_CATEGORIES.issubset(categories))
        self.assertEqual(directions, {("en", "ja"), ("ja", "en")})

    def test_dataset_ids_and_text_are_clean_utf8(self) -> None:
        cases = load_cases()
        ids = [case["id"] for case in cases]

        self.assertEqual(len(ids), len(set(ids)))

        for case in cases:
            with self.subTest(case=case["id"]):
                text = case["text"]
                self.assertEqual(text, text.encode("utf-8").decode("utf-8"))
                self.assertNotIn("\ufffd", text)
                self.assertTrue(text.strip())

    def test_all_cases_route_through_a_lightweight_fake_provider(self) -> None:
        cases = load_cases()
        provider = RecordingProvider()

        for case in cases:
            with self.subTest(case=case["id"]):
                result = translate_text(
                    case["text"],
                    case["source_lang"],
                    case["target_lang"],
                    provider,
                )

                self.assertEqual(
                    result.source_lang,
                    case["expected_source_lang"],
                )
                self.assertEqual(result.provider, "evaluation-fake")
                self.assertTrue(result.translated_text.strip())

        self.assertEqual(len(provider.calls), len(cases))


if __name__ == "__main__":
    unittest.main()
