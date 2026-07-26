# `backend/` — archived, not in use

> **This directory is not deployed and is not part of the running app.**
> It is kept as a reference for an earlier version of the architecture.

## What this was

The original WashU Pointswap API: a single-file [FastAPI](https://fastapi.tiangolo.com/)
service that ran on Railway and exposed four endpoints backed by Supabase.

## What replaced it

The live API is now **Next.js route handlers** in
[`frontend/src/app/api/`](../frontend/src/app/api), deployed as serverless functions on
the same origin as the frontend.

Consolidating the two services removed cross-origin requests entirely and eliminated a
second deployment that could fail on its own — which is exactly what happened when the
Railway service disappeared and the frontend started reporting `Failed to fetch`. The
Railway project has since been deleted.

The port was a translation rather than a redesign:

```python
# this file
@app.get("/offers")
def get_offers():
    response = supabase.table("offers").select("*, profiles(...)").eq("status", "active").execute()
    return response.data
```

```js
// frontend/src/app/api/offers/route.js
export async function GET() {
  const { data } = await supabaseServer.from('offers').select('*, profiles(...)').eq('status', 'active')
  return Response.json(data)
}
```

## Do not edit this to change app behavior

Business rules live in `frontend/src/app/api/`. Changes here have no effect on the live
site. This code has already drifted and is **not** equivalent to the live API:

- it does **not** enforce the `@wustl.edu` restriction on writes
- its routes have no `/api` prefix
- it needs CORS middleware, which the same-origin route handlers do not

## Running it anyway

The committed `venv/` is broken — it was created at an older path, so its scripts point
at a Python that no longer exists (`venv/bin/pip` fails with `bad interpreter`). Recreate
it rather than trying to repair it:

```bash
cd backend
python3 -m venv venv
venv/bin/python -m pip install -r requirements.txt
venv/bin/python main.py          # serves on :8000, reads ../.env
```

`main.py` calls `load_dotenv("../.env")`, so it must be run from this directory. Then
start the frontend with `NEXT_PUBLIC_API_URL=http://localhost:8000` to point it here
instead of at its own built-in `/api` routes.
