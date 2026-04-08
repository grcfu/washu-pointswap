from fastapi import FastAPI
from dotenv import load_dotenv
import os

# Load those secret keys from our .env file
load_dotenv(dotenv_path="../.env")

app = FastAPI()

@app.get("/")
def home():
    return {"message": "WashU Pointswap Backend is LIVE!"}

@app.get("/config-check")
def check_config():
    # This just checks if our .env keys are being read
    url = os.getenv("SUPABASE_URL")
    return {"supabase_connected": url is not None}