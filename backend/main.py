"""
ARCHIVED -- NOT DEPLOYED AND NO LONGER USED.

This was the original standalone backend for WashU Pointswap, hosted on Railway.
The live API is now Next.js route handlers in frontend/src/app/api/, running as
serverless functions on the same origin as the frontend. Nothing in production
calls this file, and the Railway service it ran on has been deleted.

It is kept only as a reference for how the API looked as a separate Python
service. Business rules must be changed in frontend/src/app/api/ -- edits here
have NO effect on the live site.

This file has already drifted from the live API. Do not treat it as equivalent:
  - it does NOT enforce the @wustl.edu restriction on writes
  - its routes have no /api prefix
  - it needs CORS middleware, which the same-origin route handlers do not

To run it anyway, from the backend/ directory:
    python main.py    # reads ../.env for SUPABASE_URL and SUPABASE_KEY
then start the frontend with NEXT_PUBLIC_API_URL=http://localhost:8000 so it
talks to this instead of its own built-in /api routes.
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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
    allow_origins=["http://localhost:3000", "https://washu-pointswap.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth dependency: verify Supabase JWT and return user ID
async def get_current_user(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth_header.split(" ", 1)[1]
    try:
        user_response = supabase.auth.get_user(token)
        return user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@app.get("/")
def home():
    return {"message": "WashU Pointswap API is running"}

# --- THE MARKETPLACE (Read Offers) ---
@app.get("/offers")
def get_offers():
    try:
        response = supabase.table("offers") \
            .select("*, profiles(first_name, last_name, contact_info)") \
            .eq("status", "active") \
            .execute()

        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CreateOfferRequest(BaseModel):
    amount: int
    price: float

# --- THE SELL PAGE (Create Offer) ---
@app.post("/offers")
def create_offer(body: CreateOfferRequest, user_id: str = Depends(get_current_user)):
    if body.amount < 100 or body.amount > 500:
        raise HTTPException(status_code=400, detail="Amount must be between 100 and 500 MP")
    if body.price <= 0:
        raise HTTPException(status_code=400, detail="Price must be greater than 0")
    if body.price > 3:
        raise HTTPException(status_code=400, detail="Price cannot exceed $3.00 per point")

    new_offer = {
        "seller_id": user_id,
        "amount": body.amount,
        "price_per_point": body.price,
        "status": "active"
    }

    response = supabase.table("offers").insert(new_offer).execute()
    return {"message": "Offer created!", "data": response.data}

#removing an offer
@app.post("/offers/{offer_id}/delete")
def delete_offer(offer_id: str, user_id: str = Depends(get_current_user)):
    response = supabase.table("offers") \
        .delete() \
        .eq("id", offer_id) \
        .eq("seller_id", user_id) \
        .execute()

    return {"message": "Offer removed", "data": response.data}

#If Railway is running me, use their port. If not, use 8000.
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
