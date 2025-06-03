import boto3
import json
import os
from typing import List, Dict, Any
import logging
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class S3Manager:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        self.bucket_name = os.getenv('S3_BUCKET_NAME')

    async def save_json_to_s3(self, key: str, data: Any, make_public: bool = True) -> str:
        """Save JSON data to S3"""
        try:
            json_data = json.dumps(data, indent=2, ensure_ascii=False)
            
            extra_args = {
                'ContentType': 'application/json',
            }
            
            if make_public:
                extra_args['ACL'] = 'public-read'

            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=json_data,
                **extra_args
            )
            
            location = f"https://{self.bucket_name}.s3.amazonaws.com/{key}"
            logger.info(f"Successfully saved data to S3: {location}")
            return location
            
        except Exception as e:
            logger.error(f"Error saving to S3: {str(e)}")
            raise

    async def get_json_from_s3(self, key: str) -> Any:
        """Get JSON data from S3"""
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
            data = json.loads(response['Body'].read().decode('utf-8'))
            logger.info(f"Successfully retrieved data from S3: {key}")
            return data
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                logger.warning(f"File not found in S3: {key}")
                return None
            else:
                logger.error(f"Error retrieving from S3: {str(e)}")
                raise
        except Exception as e:
            logger.error(f"Error retrieving from S3: {str(e)}")
            raise

    async def file_exists(self, key: str) -> bool:
        """Check if file exists in S3"""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            else:
                raise

# Create a global instance
s3_manager = S3Manager() 