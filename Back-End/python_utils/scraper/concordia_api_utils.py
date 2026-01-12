import requests
from dotenv import load_dotenv
import os

load_dotenv()

API_USER=os.getenv("CONCORDIA_USER")
API_KEY=os.getenv("CONCORDIA_KEY")

TERM=["0", "Summer", "Fall", "Fall/Winter", "Winter", "Spring (for CCCE career only)", "Summer (for CCCE career only)"]

def get_term(term_int):
    for i in range(3):
        term_int = term_int % pow(10, 3-i)
    
    return TERM[term_int]

print(get_term(1234))

'''response = requests.get(
    "https://opendata.concordia.ca/API/v1/course/section/filter/PHYS/226",
    auth=("951", "141faa6235c1e3e06ad8df13bcaa156b")
)

print(response.json())'''