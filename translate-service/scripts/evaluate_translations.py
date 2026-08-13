import json
from pathlib import Path
import sys
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = PROJECT_ROOT / "evaluation" / "chat_phrases.json"

sys.path.append(str(PROJECT_ROOT))

from app.translator import (  # noqa: E402
    DEFAULT_TRANSLATION_PROVIDER,
    InvalidTranslationOutputError,
    get_missing_pairs,
    translate_text,
)


def load_dataset() -> dict[str, Any]:
    return json.loads(DATASET_PATH.read_text(encoding="utf-8"))


def evaluate() -> int:
    missing_pairs = get_missing_pairs()

    if missing_pairs:
        missing = ", ".join(
            source + "->" + target for source, target in missing_pairs
        )
        print(
            "Cannot run Argos evaluation; install missing models: " + missing,
            file=sys.stderr,
        )
        return 2

    dataset = load_dataset()
    results: list[dict[str, object]] = []
    failure_count = 0
    warning_count = 0
    success_count = 0

    for case in dataset["cases"]:
        result: dict[str, object] = {
            "id": case["id"],
            "category": case["category"],
            "input": case["text"],
            "expectedSourceLang": case["expected_source_lang"],
            "targetLang": case["target_lang"],
        }

        try:
            translation = translate_text(
                case["text"],
                case["source_lang"],
                case["target_lang"],
            )
            result.update(
                {
                    "success": translation.warning is None,
                    "status": (
                        "warning" if translation.warning is not None else "success"
                    ),
                    "actualSourceLang": translation.source_lang,
                    "output": translation.translated_text,
                    "translationMs": translation.translation_ms,
                    "provider": translation.provider,
                }
            )
            if translation.warning is not None:
                warning_count += 1
                result.update(
                    {
                        "warningCode": translation.warning.code,
                        "warningReason": translation.warning.message,
                    }
                )
            else:
                success_count += 1
        except InvalidTranslationOutputError as error:
            failure_count += 1
            result.update(
                {
                    "success": False,
                    "status": "error",
                    "output": error.translated_text,
                    "errorType": type(error).__name__,
                    "errorCode": error.code,
                    "errorReason": str(error),
                    "provider": DEFAULT_TRANSLATION_PROVIDER.name,
                }
            )
        except Exception as error:
            failure_count += 1
            result.update(
                {
                    "success": False,
                    "status": "error",
                    "output": None,
                    "errorType": type(error).__name__,
                    "errorCode": "provider_runtime_error",
                    "errorReason": str(error),
                    "provider": DEFAULT_TRANSLATION_PROVIDER.name,
                }
            )

        results.append(result)

    print(
        json.dumps(
            {
                "datasetVersion": dataset["version"],
                "provider": DEFAULT_TRANSLATION_PROVIDER.name,
                "successCount": success_count,
                "warningCount": warning_count,
                "failureCount": failure_count,
                "results": results,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 1 if failure_count else 0


if __name__ == "__main__":
    raise SystemExit(evaluate())
