from bs4 import BeautifulSoup
from bs4.dammit import EncodingDetector
import json
import requests
import re

#----------------------------------
#There is code for scraping course data in course data/ Scraping. It might be duplicated with this file.
#This scraper includes function for cleaning and normalizing text with proper spacing.
#----------------------------------

# URL of the Concordia Mechanical Engineering courses page
url = "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-60-engineering-course-descriptions/aerospace-engineering-courses.html#3560"

# Set a user agent to mimic a real browser
USERAGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
headers = {"User-Agent": USERAGENT}

# Fetch the webpage content
resp = requests.get(url, headers=headers)
if resp.status_code != 200:
    print(f"Failed to fetch the webpage. Status code: {resp.status_code}")
    exit()

# Detect encoding
http_encoding = resp.encoding if 'charset' in resp.headers.get('content-type', '').lower() else None
html_encoding = EncodingDetector.find_declared_encoding(resp.content, is_html=True)
encoding = html_encoding or http_encoding

# Parse the HTML content with the detected encoding
soup = BeautifulSoup(resp.content, 'lxml', from_encoding=encoding)

# Prepare the list to hold extracted course data
courses = []

# Function to clean and normalize text with proper spacing
def clean_text(text):
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)  # Collapse multiple spaces into one
    text = re.sub(r'([a-zA-Z0-9])([A-Z][a-z])', r'\1 \2', text)  # Space before capital letters
    text = re.sub(r'([a-zA-Z])(\d)', r'\1 \2', text)  # Space between letters and numbers
    text = re.sub(r'(\d)([a-zA-Z])', r'\1 \2', text)  # Space between numbers and letters
    text = text.replace('\u2011', '-')  # Non-breaking hyphen to regular hyphen
    text = text.replace('\u2019', "'")  # Right single quote to straight quote
    text = text.replace('\u2014', ' — ')  # En dash with spaces
    text = text.replace('\u00a0', ' ')  # Non-breaking space to regular space
    text = re.sub(r'\s*([.,:;])\s*', r'\1 ', text)  # Single space after punctuation
    text = re.sub(r'\s+', ' ', text.strip())  # Final cleanup
    return text

# Extract course blocks
course_blocks = soup.find_all('div', class_='course')

# Process each course block
for block in course_blocks:
    try:
        # Extract title and credits
        title_element = block.find('h3', class_='accordion-header xlarge')
        if title_element:
            title_text = ' '.join(title_element.stripped_strings)
            title_match = re.match(r'^(.*)\((\d*\.?\d+)\s*credits\)$', title_text)
            if title_match:
                title = clean_text(title_match.group(1).strip())
                credits = float(title_match.group(2)) if '.' in title_match.group(2) else int(title_match.group(2))
            else:
                title = clean_text(title_text)
                credits = None
        else:
            title = None
            credits = None

        # Extract full content
        content_element = block.find('div', class_='accordion-body')
        if content_element:
            full_text = ' '.join(content_element.stripped_strings)
            full_text = clean_text(full_text)
        else:
            full_text = ""

        # Initialize fields
        prerequisites = ""
        corequisites = ""
        description = ""
        components = None
        notes = None

        # Define section markers
        markers = [
            "Prerequisite/Corequisite:",
            "Description:",
            "Component(s):",
            "Notes:"
        ]

        # Split text into sections using markers
        sections = {}
        remaining_text = full_text
        for i, marker in enumerate(markers):
            if marker in remaining_text:
                start_idx = remaining_text.index(marker) + len(marker)
                end_idx = len(remaining_text) if i == len(markers) - 1 else remaining_text.find(markers[i + 1], start_idx)
                if end_idx == -1:
                    end_idx = len(remaining_text)
                sections[marker] = clean_text(remaining_text[start_idx:end_idx].strip())
                remaining_text = remaining_text[end_idx:] if end_idx < len(remaining_text) else ""
            else:
                sections[marker] = ""

        # Process prerequisites and corequisites
        prereq_coreq_text = sections.get("Prerequisite/Corequisite:", "")
        if prereq_coreq_text:
            # Handle "previously or concurrently" case
            both_match = re.search(r'previously\s+or\s+concurrently[: ]+([A-Z]{4}\s+\d{3}(?:\s+\([^)]*\))?)\.?', prereq_coreq_text, re.IGNORECASE)
            # Handle "previously" only
            prereq_only_match = re.search(r'previously[: ]+([^.]*)\.?', prereq_coreq_text, re.IGNORECASE)
            # Handle "concurrently" only
            coreq_only_match = re.search(r'(?:or\s+)?concurrently[: ]+([A-Z]{4}\s+\d{3}(?:\s+\([^)]*\))?)\.?', prereq_coreq_text, re.IGNORECASE)

            if both_match:
                # If "previously or concurrently" is found, put the course in both fields
                course_code = clean_text(both_match.group(1) + '.')
                prerequisites = course_code
                corequisites = course_code
            elif prereq_only_match:
                # If only "previously", put it in prerequisites
                prerequisites = clean_text(prereq_only_match.group(1) + '.')
            elif coreq_only_match:
                # If only "concurrently", put it in corequisites
                corequisites = clean_text(coreq_only_match.group(1) + '.')
            else:
                # Fallback for cases without "previously" or "concurrently"
                prereq_clean = re.sub(r'^(The following course must be completed\s+)?', '', prereq_coreq_text)
                prereq_clean = re.sub(r'(previously|or concurrently)[: ]+', '', prereq_clean, flags=re.IGNORECASE)
                prerequisites = clean_text(prereq_clean)

            # Replace "or" with "/" in prerequisites
            if prerequisites:
                prerequisites = re.sub(r'\s+or\s+', ' / ', prerequisites, flags=re.IGNORECASE)

        # Assign other sections
        description = sections.get("Description:", "")
        components = sections.get("Component(s):") or None
        notes = sections.get("Notes:") or None

        # Prepare course data
        course_data = {
            "title": title,
            "credits": credits,
            "prerequisites": prerequisites,
            "corequisites": corequisites,
            "description": description,
            "components": components,
            "notes": notes
        }

        # Append to courses list
        courses.append(course_data)

    except Exception as e:
        print(f"Error processing course block: {e}")

# Save to JSON file
output_path = 'AERO_courses.json'
with open(output_path, 'w', encoding='utf-8') as json_file:
    json.dump(courses, json_file, indent=4, ensure_ascii=False)

print(f"Scraped data has been saved to {output_path}")