import requests
from dotenv import load_dotenv
import os

load_dotenv()

API_USER=os.getenv("CONCORDIA_USER")
API_KEY=os.getenv("CONCORDIA_KEY")

TERM=["0", "Summer", "Fall", "Fall/Winter", "Winter", "Spring (for CCCE career only)", "Summer (for CCCE career only)"]

def get_term(course_code):
    subject_and_catalog=course_code.split()
    terms=[]

    response = requests.get(
        f"https://opendata.concordia.ca/API/v1/course/section/filter/{subject_and_catalog[0]}/{subject_and_catalog[1]}",
        auth=(API_USER, API_KEY)
    ).json()

    for dict in response:
        term_int=int(dict["term"])
        for i in range(3):
            term_int = term_int % pow(10, 3-i)
        
        terms.append(TERM[term_int])
    return list(set(terms))