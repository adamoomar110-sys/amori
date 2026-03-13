import os
print("Script started...")
import sys
import uvicorn
from pyngrok import ngrok, conf
import threading
import time
import socket

# --- CONFIGURATION ---
PORT = 8000
# Since the user GAVE me the token in the chat, I will use it to configure ngrok programmatically.
NGROK_AUTH_TOKEN = "38IbyMFFZNBfyHUuqpDbZTPgIn0_6KyYqSjYSgFBy8gzRGEqw" 

def get_public_url(port):
    """Check if a tunnel for this port is already open via the Ngrok API."""
    try:
        import requests
        resp = requests.get("http://localhost:4040/api/tunnels")
        if resp.status_code == 200:
            tunnels = resp.json().get("tunnels", [])
            for t in tunnels:
                if str(port) in t.get("config", {}).get("addr", ""):
                    return t.get("public_url")
    except:
        pass
    return None

def start_ngrok_thread():
    print("Checking for existing Ngrok tunnel...")
    public_url = get_public_url(PORT)
    
    if not public_url:
        print("No existing tunnel found. Creating new tunnel...")
        try:
            addr = f"127.0.0.1:{PORT}"
            ngrok.set_auth_token(NGROK_AUTH_TOKEN)
            public_url = ngrok.connect(addr).public_url
        except Exception as e:
            print(f"\nCRITICAL ERROR starting Ngrok: {e}")
            return

    print("\n" + "="*60)
    print(f" AMORI GLOBAL ACCESS URL:  {public_url}")
    print("="*60 + "\n")
    print(f"Open this URL on your phone!")
    
    try:
        import qrcode
        qr = qrcode.QRCode()
        qr.add_data(public_url)
        qr.print_ascii()
    except ImportError:
        pass

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

if __name__ == "__main__":
    try:
        # Ensure backend directory is in path
        backend_dir = os.path.join(os.path.dirname(__file__), "backend")
        sys.path.append(backend_dir)
        
        # Start Ngrok in a background thread
        t = threading.Thread(target=start_ngrok_thread)
        t.daemon = True
        t.start()
        
        print(f"Starting Local Server on port {PORT}...")
        local_url = f"http://localhost:{PORT}"
        print(f"Local access: {local_url} or http://{get_local_ip()}:{PORT}")

        # Auto-open browser
        import webbrowser
        def open_browser():
            time.sleep(3)
            webbrowser.open(local_url)
        
        threading.Thread(target=open_browser, daemon=True).start()
        
        # Change dir to backend to ensure imports work
        os.chdir(backend_dir)
        
        # Run Uvicorn
        uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)
    except OSError as e:
        if e.errno == 10048:
            print(f"\nERROR: Port {PORT} is already in use!")
            time.sleep(5)
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
