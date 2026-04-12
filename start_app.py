"""
AMORI - Script de inicio v2.0
- Usa el entorno virtual (venv) para aislar dependencias
- Levanta Ngrok para acceso remoto
- Abre el navegador automáticamente
"""
import os
import sys
import subprocess
import threading
import time
import socket

# --- CONFIGURACIÓN ---
PORT = 8000
NGROK_AUTH_TOKEN = "38IbyMFFZNBfyHUuqpDbZTPgIn0_6KyYqSjYSgFBy8gzRGEqw"

ROOT_DIR    = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

# Determinar el ejecutable de Python dentro del venv
if sys.platform == "win32":
    VENV_PYTHON = os.path.join(BACKEND_DIR, "venv", "Scripts", "python.exe")
else:
    VENV_PYTHON = os.path.join(BACKEND_DIR, "venv", "bin", "python")

# Si el venv no existe, usar el Python del sistema (fallback)
if not os.path.exists(VENV_PYTHON):
    print("[AVISO] Entorno virtual no encontrado. Usando Python del sistema.")
    print("        Ejecuta: cd backend && python -m venv venv && venv\\Scripts\\pip install -r requirements.txt")
    VENV_PYTHON = sys.executable


def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP


def get_existing_ngrok_url(port):
    try:
        import requests
        resp = requests.get("http://localhost:4040/api/tunnels", timeout=2)
        if resp.status_code == 200:
            for t in resp.json().get("tunnels", []):
                if str(port) in t.get("config", {}).get("addr", ""):
                    return t.get("public_url")
    except Exception:
        pass
    return None


def start_ngrok_thread():
    time.sleep(2)  # Esperar que el servidor arranque
    print("\nVerificando túnel Ngrok existente...")
    public_url = get_existing_ngrok_url(PORT)

    if not public_url:
        print("Creando nuevo túnel Ngrok...")
        try:
            # Usar el Python del venv para ejecutar pyngrok
            result = subprocess.run(
                [VENV_PYTHON, "-c",
                 f"from pyngrok import ngrok; ngrok.set_auth_token('{NGROK_AUTH_TOKEN}'); "
                 f"t = ngrok.connect({PORT}); print(t.public_url)"],
                capture_output=True, text=True, cwd=BACKEND_DIR
            )
            public_url = result.stdout.strip()
        except Exception as e:
            print(f"\n[ERROR] No se pudo iniciar Ngrok: {e}")
            return

    if public_url:
        print("\n" + "=" * 60)
        print(f"  URL GLOBAL DE AMORI:  {public_url}")
        print(f"  Usuario: admin  |  Contraseña: amori")
        print("=" * 60)
        print("  ¡Abrí esta URL en tu celular!\n")
        try:
            import qrcode
            qr = qrcode.QRCode()
            qr.add_data(public_url)
            qr.print_ascii()
        except ImportError:
            pass


def open_browser():
    time.sleep(0.5)  # Abrir casi inmediatamente la página de carga local
    import webbrowser
    # Abrir la página de carga local (HTML estático) que hace polling al backend
    # Así el usuario ve la splash screen de AMORI en vez del error de Chrome
    loading_page = os.path.join(ROOT_DIR, "amori_loading.html")
    webbrowser.open(f"file:///{loading_page.replace(os.sep, '/')}")


if __name__ == "__main__":
    print("=" * 60)
    print("  AMORI v2.0 - Iniciando...")
    print(f"  Python: {VENV_PYTHON}")
    print(f"  Puerto: {PORT}")
    print("=" * 60)

    # Iniciar Ngrok en segundo plano
    threading.Thread(target=start_ngrok_thread, daemon=True).start()

    # Abrir navegador en segundo plano
    threading.Thread(target=open_browser, daemon=True).start()

    print(f"\n  Acceso local: http://localhost:{PORT}")
    print(f"  Acceso red:   http://{get_local_ip()}:{PORT}\n")

    try:
        # Arrancar uvicorn usando el Python del venv
        subprocess.run(
            [VENV_PYTHON, "-m", "uvicorn", "main:app",
             "--host", "0.0.0.0", "--port", str(PORT)],
            cwd=BACKEND_DIR
        )
    except KeyboardInterrupt:
        print("\n[INFO] Servidor detenido.")
    except Exception as e:
        print(f"\n[ERROR FATAL] {e}")
        import traceback
        traceback.print_exc()
        input("\nPresiona Enter para salir...")
