from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import shutil
import os
import uuid
from typing import List
from services import PDFProcessor, TTSGenerator
from deep_translator import GoogleTranslator
from langdetect import detect

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import json

# Global store for demo purposes (should be DB in prod)
# structure: { doc_id: { "path": str, "pages": [] } }
documents = {}

UPLOAD_DIR = "uploads"
AUDIO_DIR = "audio_cache"
LIBRARY_FILE = "library.json"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

pdf_processor = PDFProcessor()
tts_generator = TTSGenerator()

def load_library():
    if os.path.exists(LIBRARY_FILE):
        try:
            with open(LIBRARY_FILE, "r") as f:
                return json.load(f)
        except:
            return []
    return []

def save_to_library(book_data):
    library = load_library()
    # Check if already exists
    for book in library:
        if book["doc_id"] == book_data["doc_id"]:
            return
    library.append(book_data)
    with open(LIBRARY_FILE, "w") as f:
        json.dump(library, f, indent=2)

# Load existing documents into memory on startup
startup_library = load_library()
for book in startup_library:
    documents[book["doc_id"]] = {
        "path": book["path"],
        "filename": book["filename"],
        "status": "ready",
        "pages": book.get("pages", []) # We might want to store pages in separate file if too big
    }

class PageResponse(BaseModel):
    page: int
    text: str

class InitResponse(BaseModel):
    doc_id: str
    status: str
    filename: str

def process_pdf_background(doc_id: str, file_path: str):
    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()
            pages_data = pdf_processor.process_pdf(file_bytes)
        
        documents[doc_id]["pages"] = pages_data
        documents[doc_id]["status"] = "ready"
        
        # Save to library
        save_to_library({
            "doc_id": doc_id,
            "filename": documents[doc_id]["filename"],
            "path": file_path,
            "total_pages": len(pages_data),
            # saving pages here to persist text content. For optimization, could be separate.
            "pages": pages_data 
        })
        
        print(f"Document {doc_id} processed successfully and saved to library.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        documents[doc_id]["status"] = "error"
        documents[doc_id]["error"] = str(e)

@app.post("/upload", response_model=InitResponse)
async def upload_pdf(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # Check for duplicates
    for stored_doc_id, doc_data in documents.items():
        if doc_data.get("filename") == file.filename:
            print(f"File {file.filename} already exists. Returning existing doc_id: {stored_doc_id}")
            return {
                "doc_id": stored_doc_id,
                "status": doc_data.get("status", "ready"),
                "filename": doc_data.get("filename")
            }

    doc_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}.pdf")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Initialize document with processing status
    documents[doc_id] = {
        "path": file_path,
        "filename": file.filename,
        "status": "processing",
        "pages": []
    }
    
    # Offload processing
    background_tasks.add_task(process_pdf_background, doc_id, file_path)
    
    return {
        "doc_id": doc_id,
        "status": "processing",
        "filename": file.filename
    }

@app.get("/document/{doc_id}/status")
async def get_document_status(doc_id: str):
    if doc_id not in documents:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc = documents[doc_id]
    return {
        "status": doc["status"],
        "total_pages": len(doc["pages"]) if "pages" in doc else 0,
        "error": doc.get("error")
    }

@app.get("/document/{doc_id}/pages")
async def get_pages(doc_id: str):
    if doc_id not in documents:
        raise HTTPException(status_code=404, detail="Document not found")
    return documents[doc_id]["pages"]

@app.get("/voices")
async def get_voices():
    # Return a curated list of voices for simplicity
    voices = [
        {"ShortName": "es-AR-TomasNeural", "FriendlyName": "Tomás (Argentino)"},
        {"ShortName": "es-AR-ElenaNeural", "FriendlyName": "Elena (Argentina)"},
        {"ShortName": "es-MX-JorgeNeural", "FriendlyName": "Jorge (Mexicano)"},
        {"ShortName": "es-MX-DaliaNeural", "FriendlyName": "Dalia (Mexicana)"},
        {"ShortName": "es-ES-AlvaroNeural", "FriendlyName": "Álvaro (Español)"},
        {"ShortName": "es-ES-ElviraNeural", "FriendlyName": "Elvira (Española)"},
        {"ShortName": "en-US-GuyNeural", "FriendlyName": "Guy (English US)"},
        {"ShortName": "en-US-JennyNeural", "FriendlyName": "Jenny (English US)"},
    ]
    return voices

@app.get("/library")
async def get_library():
    return load_library()

@app.delete("/library/{doc_id}")
async def delete_book(doc_id: str):
    global documents 
    # Load current library
    current_lib = load_library()
    
    # Filter out the book to delete
    new_lib = [book for book in current_lib if book.get("doc_id") != doc_id]
    
    if len(new_lib) == len(current_lib):
        raise HTTPException(status_code=404, detail="Book not found")

    # Save updated library
    with open(LIBRARY_FILE, "w", encoding="utf-8") as f:
        json.dump(new_lib, f, indent=4)

    # Remove from memory documents if present
    if doc_id in documents:
        del documents[doc_id]

    # Remove file
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}.pdf")
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Error removing file {file_path}: {e}")
            # We continue anyway to remove it from the library view
        
    return {"status": "success", "message": "Book deleted"}

@app.get("/audio/{doc_id}/{page_num}")
async def get_audio(doc_id: str, page_num: int, voice: str = "es-AR-TomasNeural", translate: bool = False):
    if doc_id not in documents:
        raise HTTPException(status_code=404, detail="Document not found")
    
    pages = documents[doc_id]["pages"]
    if page_num < 1 or page_num > len(pages):
        raise HTTPException(status_code=404, detail="Page not found")
        
    page_data = pages[page_num - 1]
    display_text = page_data["text"]
    
    # Process text for TTS (remove newlines, etc.)
    # We do this here to ensure even old uploaded books get the improved fluidity
    tts_text = pdf_processor.clean_text(display_text)
    
    # Handle Translation Logic
    is_translated = False
    target_voice = voice
    
    if translate and tts_text.strip():
        try:
            # Detect source language
            detected_lang = detect(tts_text)
            
            # Logic: If EN -> ES, If ES -> EN
            target_lang = None
            
            if detected_lang == 'en':
                target_lang = 'es'
                target_voice = "es-AR-TomasNeural" # Force Spanish voice
            elif detected_lang == 'es':
                target_lang = 'en'
                target_voice = "en-US-GuyNeural" # Force English voice
                
            if target_lang:
                # Perform translation
                translator = GoogleTranslator(source='auto', target=target_lang)
                tts_text = translator.translate(tts_text)
                is_translated = True
                print(f"Translated page {page_num} from {detected_lang} to {target_lang}")
        except Exception as e:
            print(f"Translation error: {e}")
            # Fallback to original text if translation fails
            pass

    # Include voice, 'smooth' tag, and 'trans' tag to version the cache
    trans_tag = "_trans" if is_translated else ""
    audio_filename = f"{doc_id}_p{page_num}_{target_voice}_smooth{trans_tag}.mp3"
    audio_path = os.path.join(AUDIO_DIR, audio_filename)
    
    if not os.path.exists(audio_path):
        if not tts_text.strip():
             # Actually let's generate a silence or a message "No text"
             # Create a temporary generator for this request
             temp_tts = TTSGenerator(voice=target_voice)
             msg = "Sin texto." if target_voice.startswith("es") else "No text."
             await temp_tts.generate_audio(msg, audio_path)
        else:
             temp_tts = TTSGenerator(voice=target_voice)
             await temp_tts.generate_audio(tts_text, audio_path)
    
    return FileResponse(audio_path)

@app.get("/document/{doc_id}/image/{page_num}")
async def get_page_image(doc_id: str, page_num: int):
    if doc_id not in documents:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = documents[doc_id]["path"]
    image_bytes = pdf_processor.get_page_image(file_path, page_num)
    
    
    if not image_bytes:
        raise HTTPException(status_code=404, detail="Page not found")
        
    return Response(content=image_bytes, media_type="image/png")

# --- Static File Serving for React Frontend ---
# Make sure "frontend/dist" exists (run 'npm run build' first)
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
assets_path = os.path.join(frontend_dist, "assets")

if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

@app.get("/{catchall:path}")
async def serve_react_app(catchall: str):
    # If the request matches a file in dist (e.g. favicon.ico), serve it
    if os.path.exists(os.path.join(frontend_dist, catchall)) and catchall != "":
        return FileResponse(os.path.join(frontend_dist, catchall))
    
    # Otherwise, serve index.html for SPA routing
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return {"error": "Frontend not built. Please run 'npm run build' in frontend directory."}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
