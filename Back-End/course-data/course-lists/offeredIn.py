import json
import requests
import os
from pathlib import Path
from requests.auth import HTTPBasicAuth
import concurrent.futures

# Mapping from term code digits to season names
TERM_MAPPING = {
    '1': 'summer',
    '2': 'fall',
    '3': 'fall/winter',
    '4': 'winter',
    '5': 'spring',
    '6': 'summer (CCCE)'  # CCCE summer
}

# Set your Basic Auth credentials (use environment variables for security)
USERNAME = os.getenv("API_USERNAME", "user")
PASSWORD = os.getenv("API_PASSWORD", "pass")

INPUT_DIR = "."  # Folder containing JSON files
OUTPUT_DIR = "updated_courses"  # Folder where updated files will be saved

def get_offered_terms(course_code, course_number):
    """Fetch offered terms from the Concordia API and map to human-readable names."""
    url = f"https://opendata.concordia.ca/API/v1/course/schedule/filter/*/{course_code}/{course_number}"
    
    print(f"[DEBUG] Fetching data for {course_code} {course_number} from {url}")
    
    try:
        response = requests.get(url, auth=HTTPBasicAuth(USERNAME, PASSWORD), timeout=10)
        print(f"[DEBUG] Response status code: {response.status_code}")
        
        response.raise_for_status()
        schedule_data = response.json()
        
        print(f"[DEBUG] Received data: {json.dumps(schedule_data, indent=2)[:500]}...")  # Print only first 500 chars
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
        print(f"[ERROR] Error fetching data for {course_code} {course_number}: {str(e)}")
        return []

    terms = set()
    for entry in schedule_data:
        term_code = entry.get('termCode', '')
        print(f"[DEBUG] Processing termCode: {term_code}")
        
        if len(term_code) == 4:
            season_code = term_code[-1]
            term_name = TERM_MAPPING.get(season_code, 'unknown')
            print(f"[DEBUG] Mapped {term_code} to {term_name}")
            terms.add(term_name)
    
    sorted_terms = sorted(terms)
    print(f"[DEBUG] Final terms for {course_code} {course_number}: {sorted_terms}")
    return sorted_terms

def process_course(course):
    """Process a single course to add offeredIn field."""
    print(f"[DEBUG] Processing course: {course['title']}")
    
    title_parts = course['title'].split()
    if len(title_parts) < 2:
        print(f"[WARNING] Skipping invalid course title: {course['title']}")
        return course  # Skip invalid titles

    course_code = title_parts[0]
    course_number = title_parts[1]
    
    # Get offered terms from API
    course['offeredIn'] = get_offered_terms(course_code, course_number)
    print(f"[DEBUG] Updated course: {course}")
    return course

def process_file(input_path):
    """Process a single JSON file and save the updated version."""
    print(f"[INFO] Processing file: {input_path}")
    
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            courses = json.load(f)
    except Exception as e:
        print(f"[ERROR] Failed to read {input_path}: {str(e)}")
        return

    print(f"[DEBUG] Loaded {len(courses)} courses from {input_path}")
    
    updated_courses = [process_course(course) for course in courses]
    
    # Create output directory if needed
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    
    # Save updated file with the same name in the new folder
    output_path = os.path.join(OUTPUT_DIR, os.path.basename(input_path))
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(updated_courses, f, indent=2, ensure_ascii=False)
        print(f"[INFO] Successfully saved: {output_path}")
    except Exception as e:
        print(f"[ERROR] Failed to save {output_path}: {str(e)}")

def process_all_files():
    """Finds all JSON files in the input directory and processes them concurrently."""
    json_files = [os.path.join(INPUT_DIR, f) for f in os.listdir(INPUT_DIR) if f.endswith(".json")]

    if not json_files:
        print("[WARNING] No JSON files found in input directory.")
        return

    print(f"[INFO] Found {len(json_files)} JSON files. Processing them concurrently...")

    # Use ThreadPoolExecutor for multithreading
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(process_file, json_files)

    print(f"[INFO] Processing complete. Updated files saved in {OUTPUT_DIR}/")

if __name__ == "__main__":
    process_all_files()
