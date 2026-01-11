import requests
from dotenv import load_dotenv
import os

load_dotenv()

API_USER=os.getenv("CONCORDIA_USER")
API_KEY=os.getenv("CONCORDIA_KEY")

print(API_USER)

'''response = requests.get(
    "https://opendata.concordia.ca/API/v1/course/section/filter/PHYS/226",
    auth=("951", "141faa6235c1e3e06ad8df13bcaa156b")
)

print(response.json())'''