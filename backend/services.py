import fitz  # PyMuPDF
import easyocr
import edge_tts
import asyncio
import io
from PIL import Image
import numpy as np

class PDFProcessor:
    def __init__(self):
        # Initialize EasyOCR reader (this might take a moment on first load)
        # languages: ['en', 'es'] given the user query was Spanish, likely Spanish is needed.
        self.reader = easyocr.Reader(['es', 'en'], verbose=False) 

    def process_pdf(self, file_bytes):
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages_data = []

        for page_num, page in enumerate(doc):
            text = page.get_text()
            
            # Simple heuristic: if text is very short, try OCR
            if len(text.strip()) < 50:
                print(f"Page {page_num + 1}: Low text content, attempting OCR...")
                pix = page.get_pixmap()
                img_bytes = pix.tobytes("png")
                image = Image.open(io.BytesIO(img_bytes))
                
                # Convert to numpy array for EasyOCR
                image_np = np.array(image)
                
                # Perform OCR
                result = self.reader.readtext(image_np, detail=0)
                text = " ".join(result)
            
            pages_data.append({
                "page": page_num + 1,
                "text": text
            })
            
        return pages_data

    def get_page_image(self, file_path, page_num):
        with fitz.open(file_path) as doc:
            if page_num < 1 or page_num > len(doc):
                return None
            
            page = doc[page_num - 1]
            # Render page to an image (pixmap)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2)) # Zoom x2 for better quality
            return pix.tobytes("png")

class TTSGenerator:
    def __init__(self, voice="es-AR-TomasNeural"): # Default to Spanish voice
        self.voice = voice

    async def generate_audio(self, text, output_file):
        if not text.strip():
            return None
        communicate = edge_tts.Communicate(text, self.voice)
        await communicate.save(output_file)
        return output_file
