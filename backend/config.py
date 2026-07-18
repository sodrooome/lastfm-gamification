import os
from dotenv import load_dotenv

load_dotenv()

LASTFM_API_KEY = os.getenv("LASTFM_API_KEY")
LASTFM_API_SHARED_SECRET = os.getenv("LASTFM_SHARED_SECRET")
LASTFM_BASE_URL = "http://ws.audioscrobbler.com/2.0/"

LLM_API_KEY = os.getenv("LLM_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
