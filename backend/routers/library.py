from fastapi import APIRouter, HTTPException, Depends
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import database as db
from auth import verify_credentials

router = APIRouter(tags=["library"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")


@router.get("/library")
async def get_library(username: str = Depends(verify_credentials)):
    """Devuelve todos los libros de la librería (sin las páginas, para ir rápido)."""
    return db.get_all_books()


@router.delete("/library/{doc_id}")
async def delete_book(doc_id: str, username: str = Depends(verify_credentials)):
    """Elimina un libro de la DB y su archivo PDF físico."""
    deleted = db.delete_book(doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Libro no encontrado")

    # Eliminar archivo físico
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}.pdf")
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Advertencia: no se pudo eliminar el archivo {file_path}: {e}")

    return {"status": "success", "message": "Libro eliminado correctamente"}
