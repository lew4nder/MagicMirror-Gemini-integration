Get MMM-Template from official MM repo:
https://github.com/Dennis-Rosenbaum/MMM-Template/tree/main

Install python and all addons:
```
sudo apt-get update
sudo apt-get install xdotool python3 python3-pip portaudio19-dev flac
sudo apt install tesseract-ocr tesseract-ocr-pol
pm2 install pm2-logrotate
```

Mouse position command:
```
xdotool getmouselocation
```

Create venv for python:
```
python3 -m venv ~/voice_env
```

Activate your venv:
```
source ~/voice_env/bin/activate
```

Install addons:
```
pip3 install SpeechRecognition pyaudio
pip3 install pytesseract mss Pillow gTTS pygame
pip3 install flask flask-cors gTTS pygame
pip3 install vosk
```

To be sure, for vosk you can manually download the module, unzip it and rename the folder to "module" - this folder must be unzipped in the venv folder.
```
cd ~/voice_env
wget https://alphacephei.com/vosk/models/vosk-model-small-pl-0.22.zip
unzip vosk-model-small-pl-0.22.zip
mv vosk-model-small-pl-0.22 module && rm vosk-model-small-pl-0.22.zip
```

1. Place "voice_click.py" inside venv folder.
2. Place "MMM-Gemini.js" inside "MMM-Template" folder, delete default MMM-Template.js and rename "MMM-Template" folder name to "MMM-Gemini"
3. Place "config.js" inside "config" folder of MagicMirror location.

NOTE: There is a chance that I forgot about something - like addon for example, so you have to adjust settings and addons based on errors you get.
