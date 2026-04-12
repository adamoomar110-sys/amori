"""
Script de migración única: library.json -> amori.db (SQLite)
Ejecutar UNA SOLA VEZ con: python migrate_db.py
"""
import json
import os
import sys

# Aseguramos que el directorio backend sea encontrado
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print("=" * 60)
print("  MIGRACIÓN: library.json -> amori.db")
print("=" * 60)

LIBRARY_FILE = os.path.join(BASE_DIR, "library.json")
if not os.path.exists(LIBRARY_FILE):
    print("No se encontró library.json. No hay nada que migrar. Saliendo.")
    sys.exit(0)

# Importar módulo de base de datos (que también inicializa las tablas)
from database import save_book_full, get_all_books, DB_PATH

print(f"\nBase de datos destino: {DB_PATH}")

# Verificar si ya hay datos en la DB para evitar duplicación
existing_books = get_all_books()
if existing_books:
    print(f"\n[AVISO] Ya existen {len(existing_books)} libro(s) en amori.db.")
    answer = input("¿Deseas forzar la migración de todos modos? (s/N): ").strip().lower()
    if answer != 's':
        print("Migración cancelada. No se modificó la base de datos.")
        sys.exit(0)

# Cargar library.json
with open(LIBRARY_FILE, "r", encoding="utf-8") as f:
    library = json.load(f)

print(f"\nLibros encontrados en library.json: {len(library)}")

success_count = 0
error_count = 0

for book in library:
    doc_id = book.get("doc_id")
    filename = book.get("filename", "Desconocido")
    path = book.get("path", "")
    pages = book.get("pages", [])
    
    if not doc_id:
        print(f"  [OMITIDO] Libro sin doc_id: {filename}")
        error_count += 1
        continue

    try:
        # Necesitamos que las páginas tengan el formato {page: int, text: str}
        normalized_pages = []
        for p in pages:
            normalized_pages.append({
                "page": int(p.get("page", 0)),
                "text": p.get("text", "")
            })
        
        save_book_full(doc_id, filename, path, normalized_pages)
        print(f"  [OK] '{filename}' ({len(normalized_pages)} páginas)")
        success_count += 1
    except Exception as e:
        print(f"  [ERROR] '{filename}': {e}")
        error_count += 1

print(f"\n{'='*60}")
print(f"  Migración completada:")
print(f"  [OK] Migrados exitosamente: {success_count}")
print(f"  [ERROR] Con errores u omitidos: {error_count}")
print(f"{'='*60}")
print("\nPuedes conservar library.json como backup o eliminarlo.")
