from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os

import database as db
from services import PDFProcessor, TTSGenerator
from deep_translator import GoogleTranslator
from langdetect import detect

router = APIRouter(tags=["audio"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_DIR = os.path.join(BASE_DIR, "audio_cache")
os.makedirs(AUDIO_DIR, exist_ok=True)

pdf_processor = PDFProcessor()


def translate_text(text: str):
    if not text.strip():
        return text, False, None
    try:
        detected_lang = detect(text)
        target_lang = None
        if detected_lang == 'en':
            target_lang = 'es'
        elif detected_lang == 'es':
            target_lang = 'en'
        if target_lang:
            translator = GoogleTranslator(source='auto', target=target_lang)
            translated_text = translator.translate(text)
            return translated_text, True, target_lang
    except Exception as e:
        print(f"Translation error: {e}")
    return text, False, None


@router.get("/voices")
async def get_voices():
    """Devuelve la lista de voces TTS disponibles."""
    voices = [
        {"ShortName": "es-AR-TomasNeural",   "FriendlyName": "Tomás (Argentina)"},
        {"ShortName": "es-AR-ElenaNeural",   "FriendlyName": "Elena (Argentina)"},
        {"ShortName": "es-MX-JorgeNeural",   "FriendlyName": "Jorge (México)"},
        {"ShortName": "es-MX-DaliaNeural",   "FriendlyName": "Dalia (México)"},
        {"ShortName": "es-CO-GonzaloNeural", "FriendlyName": "Gonzalo (Colombia)"},
        {"ShortName": "es-CO-SalomeNeural",  "FriendlyName": "Salome (Colombia)"},
        {"ShortName": "es-ES-AlvaroNeural",  "FriendlyName": "Álvaro (España)"},
        {"ShortName": "es-ES-ElviraNeural",  "FriendlyName": "Elvira (España)"},
        {"ShortName": "es-US-AlonsoNeural",  "FriendlyName": "Alonso (EE.UU. Latino)"},
        {"ShortName": "es-US-PalomaNeural",  "FriendlyName": "Paloma (EE.UU. Latino)"},
        {"ShortName": "es-VE-SebastianNeural","FriendlyName": "Sebastián (Venezuela)"},
        {"ShortName": "es-VE-PaolaNeural",   "FriendlyName": "Paola (Venezuela)"},
        {"ShortName": "en-US-GuyNeural",     "FriendlyName": "Guy (English US)"},
        {"ShortName": "en-US-JennyNeural",   "FriendlyName": "Jenny (English US)"},
        {"ShortName": "en-GB-RyanNeural",    "FriendlyName": "Ryan (English UK)"},
        {"ShortName": "en-GB-SoniaNeural",   "FriendlyName": "Sonia (English UK)"},
        {"ShortName": "pt-BR-AntonioNeural", "FriendlyName": "Antônio (Brasil)"},
        {"ShortName": "pt-BR-FranciscaNeural","FriendlyName": "Francisca (Brasil)"},
        {"ShortName": "fr-FR-HenriNeural",   "FriendlyName": "Henri (France)"},
        {"ShortName": "fr-FR-DeniseNeural",  "FriendlyName": "Denise (France)"},
        {"ShortName": "it-IT-DiegoNeural",   "FriendlyName": "Diego (Italy)"},
        {"ShortName": "it-IT-ElsaNeural",    "FriendlyName": "Elsa (Italy)"},
        {"ShortName": "de-DE-ConradNeural",  "FriendlyName": "Conrad (Germany)"},
        {"ShortName": "de-DE-KatjaNeural",   "FriendlyName": "Katja (Germany)"},
    ]
    return voices


@router.get("/audio/{doc_id}/{page_num}")
async def get_audio(doc_id: str, page_num: int,
                    voice: str = "es-AR-TomasNeural",
                    translate: bool = False):
    """Genera o devuelve desde caché el audio TTS de una página."""
    text = db.get_page_text(doc_id, page_num)
    if text is None:
        raise HTTPException(status_code=404, detail="Documento o página no encontrado")

    tts_text = pdf_processor.clean_text(text)
    is_translated = False
    target_voice = voice

    if translate:
        translated_text, is_translated, target_lang = translate_text(tts_text)
        if is_translated:
            tts_text = translated_text
            target_voice = "es-AR-TomasNeural" if target_lang == 'es' else "en-US-GuyNeural"

    trans_tag = "_trans" if is_translated else ""
    audio_filename = f"{doc_id}_p{page_num}_{target_voice}_smooth{trans_tag}.mp3"
    audio_path = os.path.join(AUDIO_DIR, audio_filename)

    if not os.path.exists(audio_path):
        tts = TTSGenerator(voice=target_voice)
        msg = tts_text.strip() if tts_text.strip() else (
            "Sin texto." if target_voice.startswith("es") else "No text."
        )
        await tts.generate_audio(msg, audio_path)

    return FileResponse(audio_path)
