from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware # <--- THIS LINE IS MISSING
from supabase import create_client, Client
from dotenv import load_dotenv
import os

# Load our secret keys
load_dotenv(dotenv_path="../.env")

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

app = FastAPI()

# here, giving frontend permission to talk to back end
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://washu-pointswap.vercel.app"], # Your React app's address
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "WashU Pointswap API is running"}

# --- THE MARKETPLACE (Read Offers) ---
@app.get("/offers")
def get_offers():
    # We use the select string to define the 'Join'
    # '*, profiles(...)' means: "Get all offer columns, PLUS these specific profile columns"
    try:
        response = supabase.table("offers") \
            .select("*, profiles(first_name, last_name, contact_info)") \
            .eq("status", "active") \
            .execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

#removing an offer
@app.delete("/offers/{offer_id}")
def delete_offer(offer_id: str, user_id: str):
    # Security check: Only delete if the user_id matches the seller_id
    response = supabase.table("offers") \
        .delete() \
        .eq("id", offer_id) \
        .eq("seller_id", user_id) \
        .execute()
    
    return {"message": "Offer removed", "data": response.data}

#If Railway is running me, use their port. If not, use 8000.
if __name__ == "__main__":
    import uvicorn
    # Get the port from the environment (Railway sets this)
    # Default to 8000 if we are running locally
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)