"""
WebUtils - Web scraping and HTTP utilities module.
Provides common functionality for web requests, parsing, and data extraction.
"""

from logging import Logger
import requests
import time
import random

class WebUtils:
    def __init__(self):
        self.session = requests.Session()
        self.default_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.session.headers.update(self.default_headers)
        
        # Retry settings
        self.max_retries = 3
        self.retry_delay = 1.0
    
    def get(self, url: str) -> requests.Response:
        for attempt in range(self.max_retries + 1):
            try:
                response = self.session.get(url)
                response.raise_for_status()
                return response
                
            except requests.RequestException as e:
                if attempt == self.max_retries:
                    raise e

                delay = self.retry_delay * (2 ** attempt) + random.uniform(0, 1)
                Logger().warning(f"Request failed ({e}), retrying in {delay:.2f} seconds...")
                time.sleep(delay)
    
    def fetch_html(self, url: str) -> str:
        response = self.get(url)
        return response.text

    def get_json(self, url: str) -> dict:
        response = self.get(url)
        return response.json()
    
    def download_file(self, url: str, file_path: str) -> bool:
        try:
            response = self.get(url)
            
            with open(file_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            Logger().info(f"Downloaded: {url} -> {file_path}")
            return True
            
        except Exception as e:
            Logger().error(f"Download failed: {url} -> {file_path}, Error: {e}")
            return False