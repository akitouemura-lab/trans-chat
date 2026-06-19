from pydantic import BaseModel, Field


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    source_lang: str = Field(default="auto")
    target_lang: str = Field(default="ja")


class TranslateResponse(BaseModel):
    translated_text: str
    source_lang: str
    target_lang: str
    translation_ms: int