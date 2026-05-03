import os
import threading
import time
import json
import queue
import sys
import pyaudio
from vosk import Model, KaldiRecognizer
from flask import Flask, request, jsonify
from flask_cors import CORS
from gtts import gTTS

app = Flask(__name__)
CORS(app)

is_speaking = False

# --- KONFIGURACJA ---
TRIGGER_WORD = "action"
X_COORD_START = 861
Y_COORD_START = 369
X_COORD_CHAT = 858
Y_COORD_CHAT = 305
click_count = 0

# Ścieżka do modelu (upewnij się, że folder 'model' jest w tym samym katalogu)
MODEL_PATH = "model" 
# --------------------

if not os.path.exists(MODEL_PATH):
    print(f"BŁĄD: Nie znaleziono folderu modelu w {MODEL_PATH}!")
    sys.exit(1)

model = Model(MODEL_PATH)
rec = KaldiRecognizer(model, 16000)
audio_queue = queue.Queue()

def click_mouse():
    global click_count
    click_count += 1
    if click_count <= 2:
        curr_x, curr_y = X_COORD_START, Y_COORD_START
    else:
        curr_x, curr_y = X_COORD_CHAT, Y_COORD_CHAT
    
    os.system(f"env DISPLAY=:0 xdotool mousemove {curr_x} {curr_y} click 1")
    print(f"[KLIK] Nr {click_count} w X:{curr_x} Y:{curr_y}")

def speak_text(text):
    global is_speaking
    is_speaking = True
    try:
        tts = gTTS(text=text, lang='pl')
        tts.save("res.mp3")
        os.system("mpg123 -q res.mp3")
        os.remove("res.mp3")
    finally:
        is_speaking = False

@app.route('/speak', methods=['POST'])
def receive_text():
    data = request.json
    if data.get('text'):
        threading.Thread(target=speak_text, args=(data['text'],)).start()
        return jsonify({"status": "ok"})
    return jsonify({"status": "err"}), 400

def audio_callback(in_data, frame_count, time_info, status):
    """Przekazuje dźwięk z mikrofonu do kolejki"""
    audio_queue.put(in_data)
    return (None, pyaudio.paContinue)

def voice_listener():
    p = pyaudio.PyAudio()
    # Otwieramy strumień: 16kHz, mono (wymagane przez Vosk)
    stream = p.open(format=pyaudio.paInt16, channels=1, rate=16000, input=True, 
                    frames_per_buffer=8000, stream_callback=audio_callback)
    
    print(f"System OFFLINE gotowy. Czekam na słowo: '{TRIGGER_WORD}'...")
    stream.start_stream()

    while True:
        if is_speaking:
            time.sleep(0.1)
            continue

        data = audio_queue.get()
        if rec.AcceptWaveform(data):
            result = json.loads(rec.Result())
            text = result.get("text", "")
            
            if text:
                print(f"[LOG] Usłyszano: {text}")
                if TRIGGER_WORD in text:
                    click_mouse()

if __name__ == "__main__":
    threading.Thread(target=voice_listener, daemon=True).start()
    app.run(host='127.0.0.1', port=5000)
