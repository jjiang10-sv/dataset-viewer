from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import json
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# More permissive CORS configuration for debugging
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for debugging
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

class DatasetSaveRequest(BaseModel):
    dataset: List[Dict[str, Any]]

@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    logger.info(f"Headers: {dict(request.headers)}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

@app.options("/api/dataset/save")
async def options_handler():
    """Explicit OPTIONS handler for debugging"""
    logger.info("OPTIONS request received for /api/dataset/save")
    return {"message": "OK"}

@app.post("/api/dataset/save")
async def save_dataset(request: DatasetSaveRequest):
    try:
        logger.info(f"Received dataset with {len(request.dataset)} rows")
        
        # Save the dataset to the correct path - public folder
        with open("../public/dataset.json", "w") as f:
            json.dump(request.dataset, f, indent=2)
        
        return {"message": "Dataset saved successfully", "rows_saved": len(request.dataset)}
    except Exception as e:
        logger.error(f"Error saving dataset: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save dataset: {str(e)}")

@app.get("/")
async def root():
    return {"message": "FastAPI server is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")