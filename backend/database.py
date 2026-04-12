import sqlite3
import json
import os
from typing import List, Dict, Any

# Obtener ruta absoluta para la DB
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "amori.db")

def get_connection():
    # Usamos row_factory para obtener resultados como diccionarios
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    c = conn.cursor()
    # Tabla de libros
    c.execute('''
        CREATE TABLE IF NOT EXISTS books (
            doc_id TEXT PRIMARY KEY,
            filename TEXT,
            path TEXT,
            total_pages INTEGER,
            last_page INTEGER DEFAULT 1,
            status TEXT DEFAULT 'ready',
            error TEXT,
            summary TEXT
        )
    ''')
    # Tabla de páginas (para no saturar una sola fila con megabytes de info)
    c.execute('''
        CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doc_id TEXT,
            page_num INTEGER,
            text TEXT,
            FOREIGN KEY (doc_id) REFERENCES books (doc_id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()

# Inicializa las tablas al cargar el módulo
init_db()

def get_all_books() -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT doc_id, filename, path, total_pages, last_page, status, summary FROM books")
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_book_status(doc_id: str) -> Dict[str, Any]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT status, total_pages, error, last_page FROM books WHERE doc_id = ?", (doc_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)

def update_book_progress(doc_id: str, last_page: int) -> bool:
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE books SET last_page = ? WHERE doc_id = ?", (last_page, doc_id))
    affected = c.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def update_book_summary(doc_id: str, summary: str) -> bool:
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE books SET summary = ? WHERE doc_id = ?", (summary, doc_id))
    affected = c.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def get_book_summary(doc_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT summary FROM books WHERE doc_id = ?", (doc_id,))
    row = c.fetchone()
    conn.close()
    if row and row['summary']:
         return row['summary']
    return None

def save_book_full(doc_id: str, filename: str, path: str, pages: List[Dict[str, Any]]) -> None:
    """Inserts a new book and its pages into the DB."""
    conn = get_connection()
    c = conn.cursor()
    try:
        # Check if exists to replace or insert
        c.execute("SELECT doc_id FROM books WHERE doc_id = ?", (doc_id,))
        exists = c.fetchone()
        
        if exists:
             c.execute("DELETE FROM books WHERE doc_id = ?", (doc_id,))
             
        c.execute('''
            INSERT INTO books (doc_id, filename, path, total_pages, last_page, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (doc_id, filename, path, len(pages), 1, 'ready'))

        # Insert pages
        page_records = [(doc_id, p["page"], p["text"]) for p in pages]
        c.executemany("INSERT INTO pages (doc_id, page_num, text) VALUES (?, ?, ?)", page_records)
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def create_book_placeholder(doc_id: str, filename: str, path: str) -> None:
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO books (doc_id, filename, path, status, last_page) 
        VALUES (?, ?, ?, 'processing', 1)
    ''', (doc_id, filename, path))
    conn.commit()
    conn.close()

def set_book_error(doc_id: str, error_msg: str) -> None:
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE books SET status = 'error', error = ? WHERE doc_id = ?", (error_msg, doc_id))
    conn.commit()
    conn.close()

def get_book_pages(doc_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT page_num as page, text FROM pages WHERE doc_id = ? ORDER BY page_num ASC", (doc_id,))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_page_text(doc_id: str, page_num: int):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT text FROM pages WHERE doc_id = ? AND page_num = ?", (doc_id, page_num))
    row = c.fetchone()
    conn.close()
    if row:
        return row['text']
    return None

def get_book_path(doc_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT path FROM books WHERE doc_id = ?", (doc_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return row['path']
    return None

def get_doc_id_by_filename(filename: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT doc_id, status FROM books WHERE filename = ?", (filename,))
    row = c.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def delete_book(doc_id: str) -> bool:
     conn = get_connection()
     c = conn.cursor()
     # PRAGMA foreign_keys = ON should be set but we'll do it manually to be safe
     c.execute("DELETE FROM pages WHERE doc_id = ?", (doc_id,))
     c.execute("DELETE FROM books WHERE doc_id = ?", (doc_id,))
     affected = c.rowcount
     conn.commit()
     conn.close()
     return affected > 0
