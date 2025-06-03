# from fastapi import APIRouter, HTTPException, Request
# from pydantic import BaseModel
# from typing import List, Dict, Any
# from datetime import datetime
# import logging
# from utils.s3_utils import s3_manager

# logger = logging.getLogger(__name__)

# router = APIRouter()

# # In-memory storage (consider using Redis or database in production)
# ratings_storage: Dict[str, Dict] = {}

# class RatingSubmission(BaseModel):
#     rowId: str
#     rating: int
#     comment: str

# class RatingResponse(BaseModel):
#     success: bool
#     message: str
#     data: Dict[str, Any] = None

# @router.post("/", response_model=RatingResponse)
# async def submit_rating(rating: RatingSubmission, request: Request):
#     """Submit a rating for a specific row"""
#     try:
#         # Validate input
#         if not rating.rowId or (rating.rating == 0 and not rating.comment.strip()):
#             raise HTTPException(
#                 status_code=400,
#                 detail="Row ID and either rating or comment are required"
#             )

#         if rating.rating < 0 or rating.rating > 5:
#             raise HTTPException(
#                 status_code=400,
#                 detail="Rating must be between 0 and 5"
#             )

#         # Store rating
#         rating_data = {
#             "rowId": rating.rowId,
#             "rating": rating.rating,
#             "comment": rating.comment,
#             "timestamp": datetime.now().isoformat(),
#             "userAgent": request.headers.get("user-agent", "Unknown"),
#             "ipAddress": request.client.host if request.client else "Unknown"
#         }

#         ratings_storage[rating.rowId] = rating_data

#         # Save to S3
#         await save_ratings_to_s3()

#         logger.info(f"Rating submitted: {rating.rowId} - {rating.rating} stars")

#         return RatingResponse(
#             success=True,
#             message="Rating submitted successfully",
#             data={
#                 "rowId": rating.rowId,
#                 "rating": rating.rating,
#                 "comment": rating.comment
#             }
#         )

#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error submitting rating: {str(e)}")
#         raise HTTPException(
#             status_code=500,
#             detail=f"Failed to submit rating: {str(e)}"
#         )

# @router.get("/", response_model=Dict[str, Any])
# async def get_all_ratings():
#     """Get all ratings"""
#     try:
#         ratings_list = list(ratings_storage.values())
#         return {
#             "success": True,
#             "data": ratings_list,
#             "count": len(ratings_list)
#         }
#     except Exception as e:
#         logger.error(f"Error fetching ratings: {str(e)}")
#         raise HTTPException(
#             status_code=500,
#             detail=f"Failed to fetch ratings: {str(e)}"
#         )

# @router.get("/{row_id}")
# async def get_rating_by_row(row_id: str):
#     """Get rating for a specific row"""
#     try:
#         if row_id in ratings_storage:
#             return {
#                 "success": True,
#                 "data": ratings_storage[row_id]
#             }
#         else:
#             raise HTTPException(
#                 status_code=404,
#                 detail="Rating not found for this row"
#             )
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error fetching rating: {str(e)}")
#         raise HTTPException(
#             status_code=500,
#             detail=f"Failed to fetch rating: {str(e)}"
#         )

# @router.delete("/{row_id}")
# async def delete_rating(row_id: str):
#     """Delete a rating for a specific row"""
#     try:
#         if row_id in ratings_storage:
#             del ratings_storage[row_id]
#             await save_ratings_to_s3()
#             return {
#                 "success": True,
#                 "message": "Rating deleted successfully"
#             }
#         else:
#             raise HTTPException(
#                 status_code=404,
#                 detail="Rating not found for this row"
#             )
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error deleting rating: {str(e)}")
#         raise HTTPException(
#             status_code=500,
#             detail=f"Failed to delete rating: {str(e)}"
#         )

# async def save_ratings_to_s3():
#     """Save all ratings to S3"""
#     try:
#         ratings_list = list(ratings_storage.values())
#         await s3_manager.save_json_to_s3('dataset-viewer/ratings.json', ratings_list)
#         logger.info("Ratings saved to S3 successfully")
#     except Exception as e:
#         logger.error(f"Error saving ratings to S3: {str(e)}")
#         raise

# async def load_ratings_from_s3():
#     """Load existing ratings from S3"""
#     try:
#         ratings_data = await s3_manager.get_json_from_s3('dataset-viewer/ratings.json')
#         if ratings_data:
#             for rating in ratings_data:
#                 ratings_storage[rating['rowId']] = rating
#             logger.info(f"Loaded {len(ratings_data)} ratings from S3")
#     except Exception as e:
#         logger.warning(f"Could not load ratings from S3: {str(e)}")

# # Load existing ratings on startup
# import asyncio
# asyncio.create_task(load_ratings_from_s3()) 