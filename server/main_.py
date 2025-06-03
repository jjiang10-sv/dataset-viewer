from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import boto3
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
import logging
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from routers import  dataset

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Dataset Viewer API",
    description="Backend API for Dataset Viewer with S3 integration",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure AWS S3
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION', 'us-east-1')
)

BUCKET_NAME = os.getenv('S3_BUCKET_NAME')
DATASET_KEY = 'dataset-viewer/dataset.json'
RATINGS_KEY = 'dataset-viewer/ratings.json'

# In-memory storage for ratings (consider using Redis or database in production)
ratings_storage: Dict[str, Dict] = {}

# Pydantic models
class RatingSubmission(BaseModel):
    rowId: str
    rating: int
    comment: str

class DatasetRow(BaseModel):
    id: str
    data: Dict[str, Any]

class DatasetUpdate(BaseModel):
    dataset: List[Dict[str, Any]]

# Include routers
#app.include_router(ratings.router, prefix="/api/ratings", tags=["ratings"])
app.include_router(dataset.router, prefix="/api/dataset", tags=["dataset"])

# Serve static files
app.mount("/", StaticFiles(directory="../public", html=True), name="static")

@app.get("/")
async def root():
    return {"message": "Dataset Viewer API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 