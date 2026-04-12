"""
AMORI Backend v2.0
- FastAPI + SQLite (reemplaza library.json)
- Rutas modularizadas en routers/
- Basic Auth para proteger acceso remoto (Ngrok)
- Credenciales configurables via variables de entorno o .env
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

import database as db
from auth import verify_credentials, AUTH_USER, AUTH_PASS, security
from routers import documents, audio, library

load_dotenv()

app = FastAPI(
    title="Amori API",
    description="Backend para la aplicación de lectura Amori",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




# --- INCLUIR ROUTERS ---
app.include_router(documents.router)
app.include_router(audio.router)
app.include_router(library.router)

# --- IMPRIMIR INFO AL ARRANCAR ---
print("=" * 60)
print("  AMORI BACKEND v2.0 INICIANDO")
print("  SQLite: ACTIVADO  |  Basic Auth: ACTIVADO")
print(f"  Usuario: '{AUTH_USER}' / Contraseña: '{AUTH_PASS}'")
print("=" * 60)

# --- SERVIR FRONTEND REACT ---
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
assets_path = os.path.join(frontend_dist, "assets")

if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")


@app.get("/{catchall:path}")
async def serve_react_app(catchall: str):
    """Sirve el SPA de React para cualquier ruta no reconocida como API."""
    full_path = os.path.join(frontend_dist, catchall)
    if catchall and os.path.exists(full_path):
        return FileResponse(full_path)

    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        resp = FileResponse(index_path)
        resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        return resp

    return {"error": "Frontend no compilado. Ejecuta 'npm run build' en el directorio frontend."}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
