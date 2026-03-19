# Vosk Model — Place Model Folder Here

Download the small English model (~50 MB) from:
https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip

Extract the ZIP so the folder structure looks like:

  ai-brain/models/vosk-model-small-en-us-0.15/
    ├── am/
    ├── conf/
    ├── graph/
    ├── ivector/
    └── README

Then update VOSK_MODEL_PATH in your .env to point to this folder,
or leave it at the default (it already points here).

For better accuracy (slower, ~1.8 GB):
https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip
