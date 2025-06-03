from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import logging
from utils.s3_utils import s3_manager

logger = logging.getLogger(__name__)

router = APIRouter()

class DatasetUpdate(BaseModel):
    dataset: List[Dict[str, Any]]

class DatasetRow(BaseModel):
    data: Dict[str, Any]

@router.get("/")
async def get_dataset():
    """Get the current dataset from S3"""
    try:
        dataset = await s3_manager.get_json_from_s3('dataset-viewer/dataset.json')
        
        if dataset is None:
            # Return empty dataset if file doesn't exist
            return {
                "success": True,
                "data": [],
                "message": "No dataset found, returning empty dataset"
            }
        
        return {
            "success": True,
            "data": dataset,
            "count": len(dataset) if isinstance(dataset, list) else 0
        }
        
    except Exception as e:
        logger.error(f"Error fetching dataset: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch dataset: {str(e)}"
        )

@router.put("/")
async def update_dataset(dataset_update: DatasetUpdate):
    """Update the entire dataset"""
    try:
        if not isinstance(dataset_update.dataset, list):
            raise HTTPException(
                status_code=400,
                detail="Dataset must be an array"
            )

        # Validate that each row has an ID
        for i, row in enumerate(dataset_update.dataset):
            if not isinstance(row, dict):
                raise HTTPException(
                    status_code=400,
                    detail=f"Row {i} must be an object"
                )
            
            # Ensure each row has an ID
            if 'id' not in row:
                row['id'] = str(i + 1)

        # Save to S3
        location = await s3_manager.save_json_to_s3(
            'dataset-viewer/dataset.json', 
            dataset_update.dataset
        )

        return {
            "success": True,
            "message": "Dataset updated successfully",
            "location": location,
            "count": len(dataset_update.dataset)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating dataset: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update dataset: {str(e)}"
        )

@router.post("/row")
async def add_row_to_dataset(row_data: DatasetRow):
    """Add a new row to the dataset"""
    try:
        # Get current dataset
        current_dataset = await s3_manager.get_json_from_s3('dataset-viewer/dataset.json')
        
        if current_dataset is None:
            current_dataset = []
        
        # Add ID if not present
        if 'id' not in row_data.data:
            # Generate new ID
            max_id = 0
            for row in current_dataset:
                if 'id' in row:
                    try:
                        row_id = int(row['id'])
                        max_id = max(max_id, row_id)
                    except (ValueError, TypeError):
                        pass
            row_data.data['id'] = str(max_id + 1)

        # Add new row
        current_dataset.append(row_data.data)

        # Save back to S3
        location = await s3_manager.save_json_to_s3(
            'dataset-viewer/dataset.json', 
            current_dataset
        )

        return {
            "success": True,
            "message": "Row added successfully",
            "location": location,
            "newRow": row_data.data,
            "totalRows": len(current_dataset)
        }

    except Exception as e:
        logger.error(f"Error adding row: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add row: {str(e)}"
        )

@router.delete("/row/{row_id}")
async def delete_row_from_dataset(row_id: str):
    """Delete a row from the dataset"""
    try:
        # Get current dataset
        current_dataset = await s3_manager.get_json_from_s3('dataset-viewer/dataset.json')
        
        if current_dataset is None:
            raise HTTPException(
                status_code=404,
                detail="Dataset not found"
            )

        # Find and remove the row
        original_length = len(current_dataset)
        current_dataset = [row for row in current_dataset if str(row.get('id')) != row_id]
        
        if len(current_dataset) == original_length:
            raise HTTPException(
                status_code=404,
                detail=f"Row with ID {row_id} not found"
            )

        # Save back to S3
        location = await s3_manager.save_json_to_s3(
            'dataset-viewer/dataset.json', 
            current_dataset
        )

        return {
            "success": True,
            "message": f"Row {row_id} deleted successfully",
            "location": location,
            "totalRows": len(current_dataset)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting row: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete row: {str(e)}"
        )

@router.post("/save")
async def save_dataset(dataset_update: DatasetUpdate):
    """Save the entire dataset with ratings and comments"""
    try:
        if not isinstance(dataset_update.dataset, list):
            raise HTTPException(
                status_code=400,
                detail="Dataset must be an array"
            )

        # Validate that each row has an ID
        for i, row in enumerate(dataset_update.dataset):
            if not isinstance(row, dict):
                raise HTTPException(
                    status_code=400,
                    detail=f"Row {i} must be an object"
                )
            
            # Ensure each row has an ID
            if 'id' not in row:
                row['id'] = str(i + 1)

        # Save to S3
        location = await s3_manager.save_json_to_s3(
            'dataset-viewer/dataset.json', 
            dataset_update.dataset
        )

        return {
            "success": True,
            "message": "Dataset saved successfully",
            "location": location,
            "count": len(dataset_update.dataset)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving dataset: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save dataset: {str(e)}"
        ) 