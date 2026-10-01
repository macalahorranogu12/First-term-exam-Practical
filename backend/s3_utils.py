import os
import uuid
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv

load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET_VIDEOS = os.getenv("S3_BUCKET_VIDEOS", "")
S3_BUCKET_THUMBNAILS = os.getenv("S3_BUCKET_THUMBNAILS", "")

def get_s3_client():
    # boto3 utilizará automáticamente el IAM Role asociado a la instancia EC2 si no hay keys explícitas
    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    aws_session_token = os.getenv("AWS_SESSION_TOKEN")

    if aws_access_key and aws_secret_key:
        return boto3.client(
            "s3",
            region_name=AWS_REGION,
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            aws_session_token=aws_session_token
        )
    return boto3.client("s3", region_name=AWS_REGION)

def upload_file_to_s3(file_obj, original_filename: str, bucket_name: str, content_type: str) -> str:
    """
    Sube un archivo a S3 y retorna la URL pública correspondiente.
    """
    if not bucket_name:
        raise ValueError("El nombre del bucket de S3 no está configurado.")

    ext = original_filename.split(".")[-1].lower() if "." in original_filename else ""
    unique_key = f"{uuid.uuid4().hex}_{original_filename.replace(' ', '_')}"

    s3_client = get_s3_client()
    s3_client.upload_fileobj(
        file_obj,
        bucket_name,
        unique_key,
        ExtraArgs={"ContentType": content_type}
    )

    url = f"https://{bucket_name}.s3.{AWS_REGION}.amazonaws.com/{unique_key}"
    return url

def delete_file_from_s3(url: str, bucket_name: str):
    """
    Elimina un archivo de S3 a partir de su URL pública si pertenece al bucket.
    """
    try:
        if not bucket_name or bucket_name not in url:
            return
        key = url.split(f"{bucket_name}.s3.{AWS_REGION}.amazonaws.com/")[-1]
        s3_client = get_s3_client()
        s3_client.delete_object(Bucket=bucket_name, Key=key)
    except Exception as e:
        print(f"Error al eliminar de S3 ({url}): {e}")
