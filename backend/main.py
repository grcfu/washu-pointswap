from fastapi import FastAPI, HTTPException
from supabase import create_client, Client
from dotenv import load_dotenv
import os

# Load our secret keys
load_dotenv(dotenv_path="../.env")

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

app = FastAPI()

@app.get("/")
def home():
    return {"message": "WashU Pointswap API is running"}

# --- THE MARKETPLACE (Read Offers) ---
@app.get("/offers")
def get_offers():
    """
    This replaces her 'get_cached_offers' logic.
    It fetches all 'active' offers from the database.
    """
    response = supabase.table("offers").select("*").eq("status", "active").execute()
    
    # Her logic used to sort by price/amount—Supabase does this for us!
    # We can add .order("price_per_point") if we want.
    return response.data

# --- THE SELL PAGE (Create Offer) ---
@app.post("/offers")
def create_offer(seller_id: str, amount: int, price: float):
    """
    This replaces her 'commit_offer' logic.
    It checks the limits (150-2000) and saves to Supabase.
    """
    if amount < 150 or amount > 2000:
        raise HTTPException(status_code=400, detail="Amount must be between 150 and 2000 MP")

    new_offer = {
        "seller_id": seller_id,
        "amount": amount,
        "price_per_point": price,
        "status": "active"
    }
    
    response = supabase.table("offers").insert(new_offer).execute()
    return {"message": "Offer created!", "data": response.data}