from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel
import shutil
import os
import uuid
import re

import database as db
from services import PDFProcessor
from ai_service import ClaudeService
from deep_translator import GoogleTranslator
from langdetect import detect

try:
    import httpx
    _USE_HTTPX = True
except ImportError:
    import urllib.request
    _USE_HTTPX = False

router = APIRouter(prefix="/document", tags=["documents"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

pdf_processor = PDFProcessor()
summarizer = ClaudeService()


class ProgressRequest(BaseModel):
    page: int


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


def process_pdf_background(doc_id: str, file_path: str, filename: str):
    try:
        pages_data = pdf_processor.process_pdf(file_path)
        db.save_book_full(doc_id, filename, file_path, pages_data)
        print(f"[OK] Documento {doc_id} procesado y guardado en SQLite.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.set_book_error(doc_id, str(e))


@router.post("/upload")
async def upload_pdf(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # Verificar duplicados por nombre de archivo
    existing = db.get_doc_id_by_filename(file.filename)
    if existing:
        return {
            "doc_id": existing["doc_id"],
            "status": existing["status"],
            "filename": file.filename
        }

    doc_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}.pdf")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Crear placeholder en DB con status 'processing'
    db.create_book_placeholder(doc_id, file.filename, file_path)

    # Procesar en background
    background_tasks.add_task(process_pdf_background, doc_id, file_path, file.filename)

    return {"doc_id": doc_id, "status": "processing", "filename": file.filename}


class UploadUrlRequest(BaseModel):
    url: str


@router.post("/upload-url")
async def upload_pdf_from_url(background_tasks: BackgroundTasks, body: UploadUrlRequest):
    """Descarga un PDF desde una URL y lo procesa igual que un upload local."""
    url = body.url.strip()

    # Validar que sea una URL con esquema http/https
    if not re.match(r'^https?://', url, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="La URL debe comenzar con http:// o https://")

    # Extraer nombre del archivo de la URL
    filename = url.split("?")[0].split("/")[-1]
    if not filename.lower().endswith(".pdf"):
        filename = filename + ".pdf" if filename else "documento_web.pdf"

    # Verificar duplicados
    existing = db.get_doc_id_by_filename(filename)
    if existing:
        return {
            "doc_id": existing["doc_id"],
            "status": existing["status"],
            "filename": filename
        }

    doc_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}.pdf")

    # Descargar el archivo
    try:
        if _USE_HTTPX:
            with httpx.Client(follow_redirects=True, timeout=60) as client:
                r = client.get(url)
                r.raise_for_status()
                with open(file_path, "wb") as f:
                    f.write(r.content)
        else:
            headers = {"User-Agent": "Mozilla/5.0"}
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as resp:
                with open(file_path, "wb") as f:
                    shutil.copyfileobj(resp, f)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo descargar el PDF desde la URL: {e}")

    # Crear placeholder en DB
    db.create_book_placeholder(doc_id, filename, file_path)

    # Procesar en background
    background_tasks.add_task(process_pdf_background, doc_id, file_path, filename)

    return {"doc_id": doc_id, "status": "processing", "filename": filename}


@router.get("/{doc_id}/status")
async def get_document_status(doc_id: str):
    status = db.get_book_status(doc_id)
    if not status:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return status


@router.post("/{doc_id}/progress")
async def update_progress(doc_id: str, progress: ProgressRequest):
    updated = db.update_book_progress(doc_id, progress.page)
    if not updated:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return {"status": "success", "page": progress.page}


@router.get("/{doc_id}/pages")
async def get_pages(doc_id: str):
    pages = db.get_book_pages(doc_id)
    if pages is None:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return pages


@router.get("/{doc_id}/page/{page_num}/text")
async def get_page_text(doc_id: str, page_num: int, translate: bool = False):
    text = db.get_page_text(doc_id, page_num)
    if text is None:
        raise HTTPException(status_code=404, detail="Página no encontrada")
    is_translated = False
    if translate:
        text, is_translated, _ = translate_text(text)
    return {"text": text, "is_translated": is_translated}


@router.get("/{doc_id}/image/{page_num}")
async def get_page_image(doc_id: str, page_num: int):
    file_path = db.get_book_path(doc_id)
    if not file_path:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    image_bytes = pdf_processor.get_page_image(file_path, page_num)
    if not image_bytes:
        raise HTTPException(status_code=404, detail="Página no encontrada")
    return Response(content=image_bytes, media_type="image/png")


@router.post("/{doc_id}/summary")
async def get_document_summary(doc_id: str):
    # Verificar si ya existe un resumen en DB
    cached_summary = db.get_book_summary(doc_id)
    if cached_summary:
        return {"summary": cached_summary}

    pages = db.get_book_pages(doc_id)
    if not pages:
        raise HTTPException(status_code=404, detail="Documento no encontrado o sin páginas")

    full_text = "\n".join(p["text"] for p in pages)
    if len(full_text.strip()) < 50:
        return {"summary": "El documento no tiene suficiente texto para generar un resumen."}

    summary = summarizer.generate_summary(full_text)

    # Persistir en SQLite
    db.update_book_summary(doc_id, summary)

    return {"summary": summary}
