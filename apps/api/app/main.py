from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import support_ops, sse_stream
from app.routers import compliance

app = FastAPI(title="Nexus Core API Gateway", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production to your dashboard domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount SupportOps and SSE Streaming Routers
app.include_router(support_ops.router)
app.include_router(sse_stream.router)
app.include_router(compliance.router)

@app.get("/")
def read_root():
    return {"status": "online", "system": "Nexus Core AI Engine"}