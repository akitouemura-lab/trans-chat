import logging

from fastapi import FastAPI, HTTPException
from app.schemas import (
    TranslateRequest,
    TranslateResponse,
    TranslationWarningResponse,
)
from app.translator import (
    DEFAULT_TRANSLATION_PROVIDER,
    InvalidTranslationOutputError,
    MissingLanguageModelError,
    are_required_packages_installed,
    get_missing_pairs,
    translate_text,
)

logger = logging.getLogger(__name__)


app = FastAPI(
    title="TransChat Translate Service",
)


@app.get("/health")
def health() -> dict[str, object]:
    missing_pairs = get_missing_pairs()
    models_ready = len(missing_pairs) == 0

    return {
        "status": "ok" if models_ready else "degraded",
        "service": "translate-service",
        "provider": DEFAULT_TRANSLATION_PROVIDER.name,
        "modelsReady": models_ready,
        "missingPairs": [
            {"source": source, "target": target} for source, target in missing_pairs
        ],
    }


@app.post("/translate", response_model=TranslateResponse)
def translate(request: TranslateRequest) -> TranslateResponse:
    if not are_required_packages_installed():
        raise HTTPException(
            status_code=503,
            detail="Required Argos language model is not installed.",
        )

    try:
        result = translate_text(
            request.text,
            request.source_lang,
            request.target_lang,
        )

        return TranslateResponse(
            translated_text=result.translated_text,
            source_lang=result.source_lang,
            target_lang=request.target_lang,
            translation_ms=result.translation_ms,
            provider=result.provider,
            warning=(
                TranslationWarningResponse(
                    code=result.warning.code,
                    message=result.warning.message,
                )
                if result.warning is not None
                else None
            ),
        )

    except InvalidTranslationOutputError as error:
        raise HTTPException(
            status_code=502,
            detail={
                "code": error.code,
                "message": str(error),
                "provider": DEFAULT_TRANSLATION_PROVIDER.name,
            },
        ) from error
    except MissingLanguageModelError as error:
        raise HTTPException(
            status_code=503,
            detail="Required Argos language model is not installed.",
        ) from error
    except Exception as error:
        logger.exception("translation failed")
        raise HTTPException(
            status_code=500,
            detail="Translation failed",
        ) from error
