from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import logging
import math
import io
import asyncio

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

class PaginatedResponse(BaseModel):
    data: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool

@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    logger.info(f"Headers: {dict(request.headers)}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

def load_dataset() -> List[Dict[str, Any]]:
    """Load dataset from file"""
    try:
        with open("../public/dataset.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_dataset(dataset: List[Dict[str, Any]]):
    """Save dataset to file"""
    with open("../public/dataset.json", "w") as f:
        json.dump(dataset, f, indent=2)

@app.get("/v1/dataset/paginated")
async def get_dataset_paginated(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(50, ge=1, le=1000, description="Number of items per page"),
    search: Optional[str] = Query(None, description="Search term"),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: Optional[str] = Query("asc", regex="^(asc|desc)$", description="Sort order")
) -> PaginatedResponse:
    """Get paginated dataset with optional search and sorting"""
    try:
        dataset = load_dataset()
        
        # Apply search filter if provided
        if search:
            search_lower = search.lower()
            dataset = [
                row for row in dataset 
                if any(
                    search_lower in str(value).lower() 
                    for value in row.values()
                )
            ]
        
        # Apply sorting if provided
        if sort_by and sort_by in (dataset[0] if dataset else {}):
            reverse = sort_order == "desc"
            dataset.sort(key=lambda x: x.get(sort_by, ""), reverse=reverse)
        
        total = len(dataset)
        total_pages = math.ceil(total / page_size)
        
        # Calculate pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_data = dataset[start_idx:end_idx]
        
        return PaginatedResponse(
            data=paginated_data,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1
        )
        
    except Exception as e:
        logger.error(f"Error getting paginated dataset: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get dataset: {str(e)}")

@app.get("/v1/dataset/stream")
async def stream_dataset(
    chunk_size: int = Query(100, ge=1, le=1000, description="Chunk size for streaming")
):
    """Stream dataset in chunks"""
    async def generate_chunks():
        try:
            dataset = load_dataset()
            total_records = len(dataset)
            
            # Send metadata first
            metadata = {
                "type": "metadata",
                "total_records": total_records,
                "chunk_size": chunk_size,
                "total_chunks": math.ceil(total_records / chunk_size)
            }
            yield f"data: {json.dumps(metadata)}\n\n"
            
            # Stream data in chunks
            for i in range(0, total_records, chunk_size):
                chunk = dataset[i:i + chunk_size]
                chunk_data = {
                    "type": "chunk",
                    "chunk_index": i // chunk_size,
                    "data": chunk,
                    "start_idx": i,
                    "end_idx": min(i + chunk_size, total_records)
                }
                yield f"data: {json.dumps(chunk_data)}\n\n"
                
                # Add small delay to prevent overwhelming the client
                await asyncio.sleep(0.01)
                
            # Send completion signal
            completion = {"type": "complete"}
            yield f"data: {json.dumps(completion)}\n\n"
            
        except Exception as e:
            error_data = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        generate_chunks(), 
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.get("/v1/dataset/chunk/{chunk_index}")
async def get_dataset_chunk(
    chunk_index: int,
    chunk_size: int = Query(1000, ge=1, le=10000, description="Chunk size")
):
    """Get a specific chunk of the dataset"""
    try:
        dataset = load_dataset()
        total_records = len(dataset)
        
        start_idx = chunk_index * chunk_size
        end_idx = min(start_idx + chunk_size, total_records)
        
        if start_idx >= total_records:
            raise HTTPException(status_code=404, detail="Chunk not found")
        
        chunk_data = dataset[start_idx:end_idx]
        
        return {
            "chunk_index": chunk_index,
            "chunk_size": len(chunk_data),
            "start_idx": start_idx,
            "end_idx": end_idx,
            "total_records": total_records,
            "data": chunk_data
        }
        
    except Exception as e:
        logger.error(f"Error getting chunk {chunk_index}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get chunk: {str(e)}")

@app.post("/v1/dataset/batch-save")
async def batch_save_dataset(
    chunks: List[List[Dict[str, Any]]] = Body(...),
    append: bool = Body(False, description="Whether to append or replace dataset")
):
    """Save dataset in batches/chunks"""
    try:
        if append:
            existing_dataset = load_dataset()
        else:
            existing_dataset = []
        
        # Flatten chunks into single dataset
        new_data = []
        for chunk in chunks:
            new_data.extend(chunk)
        
        final_dataset = existing_dataset + new_data if append else new_data
        
        # Save in chunks to handle memory efficiently
        save_dataset(final_dataset)
        
        return {
            "message": "Dataset saved successfully",
            "total_chunks": len(chunks),
            "total_records": len(final_dataset),
            "operation": "append" if append else "replace"
        }
        
    except Exception as e:
        logger.error(f"Error batch saving dataset: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save dataset: {str(e)}")

@app.options("/v1/saveDataset")
async def options_handler():
    """Explicit OPTIONS handler for debugging"""
    logger.info("OPTIONS request received for /v1/saveDataset")
    return {"message": "OK"}

@app.post("/v1/saveDataset")
async def save_dataset_endpoint(request_data: dict = Body(...)):
    try:
        logger.info(f"Received raw data: {request_data}")
        
        # Extract dataset from the request
        if "dataset" not in request_data:
            raise HTTPException(status_code=400, detail="Missing 'dataset' field in request body")
        
        dataset = request_data["dataset"]
        logger.info(f"Extracted dataset with {len(dataset)} rows")
        
        # Save the dataset to the correct path - public folder
        save_dataset(dataset)
        
        return {"message": "Dataset saved successfully", "rows_saved": len(dataset)}
    except Exception as e:
        logger.error(f"Error saving dataset: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save dataset: {str(e)}")

@app.get("/")
async def root():
    return {"message": "FastAPI server is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "FastAPI server is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")