import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from app.schemas import TranslateRequest, TranslateResponse
from app.translator import install_language_packages, translate_text

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    install_language_packages()
    yield


app = FastAPI(
    title="TransChat Translate Service",
    lifespan=lifespan,
)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "translate-service",
    }


@app.post("/translate", response_model=TranslateResponse)
def translate(request: TranslateRequest) -> TranslateResponse:
    try:
        translated_text, translation_ms, actual_source_lang = translate_text(
            request.text,
            request.source_lang,
            request.target_lang,
        )

        return TranslateResponse(
            translated_text=translated_text,
            source_lang=actual_source_lang,
            target_lang=request.target_lang,
            translation_ms=translation_ms,
        )

    except Exception as error:
        logger.exception("translation failed")
        raise HTTPException(
            status_code=500,
            detail="Translation failed",
        ) from error
