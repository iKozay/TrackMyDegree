"""
WebUtils - Web scraping and HTTP utilities module.
Provides common functionality for web requests, parsing, and data extraction.
"""

import requests
import time
import random
from .logging_utils import get_logger

session = requests.Session()
default_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}
session.headers.update(default_headers)

# Retry settings
max_retries = 3
retry_delay = 1.0
logger = get_logger("WebUtils")

def get(url: str) -> requests.Response:
    for attempt in range(max_retries + 1):
        try:
            response = session.get(url, timeout=60)
            response.raise_for_status()
            return response
            
        except requests.RequestException as e:
            if attempt == max_retries:
                raise e

            delay = retry_delay * (2 ** attempt) + random.uniform(0, 1)
            logger.warning(f"Request failed ({e}), retrying in {delay:.2f} seconds...")
            time.sleep(delay)

def fetch_html(url: str) -> str:
    response = get(url)
    return response.text

def get_json(url: str) -> dict:
    response = get(url)
    return response.json()

def download_file(url: str, file_path: str) -> bool:
    try:
        response = get(url)
        
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        logger.info(f"Downloaded: {url} -> {file_path}")
        return True
        
    except Exception as e:
        logger.error(f"Download failed: {url} -> {file_path}, Error: {e}")
        return False