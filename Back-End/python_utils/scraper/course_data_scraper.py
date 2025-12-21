from bs4 import BeautifulSoup
from bs4.dammit import EncodingDetector
import requests
import re


#----------------------------------
#There is code for scraping course data in course data/ Scraping. It might be duplicated with this file.
#This scraper includes function for cleaning and normalizing text with proper spacing.
#----------------------------------

courses=[]

# Function to clean and normalize text with proper spacing
def clean_text(text):
    if not text:
        return ""

    SPACE_REPLACEMENT = r'\1 \2'

    text = re.sub(r'\s+', ' ', text)  # Collapse multiple spaces into one
    text = re.sub(r'([a-zA-Z0-9])([A-Z][a-z])', SPACE_REPLACEMENT, text)  # Space before capital letters
    text = re.sub(r'([a-zA-Z])(\d)', SPACE_REPLACEMENT, text)  # Space between letters and numbers
    text = re.sub(r'(\d)([a-zA-Z])', SPACE_REPLACEMENT, text)  # Space between numbers and letters
    text = text.replace('\u2011', '-')  # Non-breaking hyphen to regular hyphen
    text = text.replace('\u2019', "'")  # Right single quote to straight quote
    text = text.replace('\u2014', ' — ')  # En dash with spaces
    text = text.replace('\u00a0', ' ')  # Non-breaking space to regular space
    text = re.sub(r'\s*([.,:;])\s*', r'\1 ', text)  # Single space after punctuation
    text = re.sub(r'\s+', ' ', text.strip())  # Final cleanup
    return text

def fetch_html(url):
    """Fetch HTML and return a BeautifulSoup object."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/91.0.4472.124 Safari/537.36"
        )
    }
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print(f"Failed to fetch webpage: {resp.status_code}")
        return None

    encoding = (
        EncodingDetector.find_declared_encoding(resp.content, is_html=True)
        or (resp.encoding if 'charset' in resp.headers.get('content-type', '').lower() else None)
    )
    return BeautifulSoup(resp.content, 'lxml', from_encoding=encoding)


def parse_title_and_credits(title_text, clean_text):
    """Extract course ID, title, and credits from the header text."""
    pattern = r'^([A-Z]{4}\s*\d+)\s+([^()]+?)\s*\(\s*(\d+(?:\.\d+)?)\s*credits\s*\)$'
    match = re.match(pattern, title_text)

    if not match:
        pattern = r'^([A-Z]{3}\s*\d+)\s+([^()]+?)\s*\(\s*(\d+(?:\.\d+)?)\s*credits\s*\)$'
        match = re.match(pattern, title_text)
        if not match:
            return None, clean_text(title_text), None

    course_id = clean_text(match.group(1))
    title = clean_text(match.group(2))
    credit_str = match.group(3)
    course_credits = float(credit_str) if '.' in credit_str else int(credit_str)
    return course_id, title, course_credits


def split_sections(text, clean_text):
    """Split course text into labeled sections."""
    markers = ["Prerequisite/Corequisite:", "Description:", "Component(s):", "Notes:"]
    sections, remaining = {}, text

    for i, marker in enumerate(markers):
        start = remaining.find(marker)
        if start == -1:
            sections[marker] = ""
            continue

        start += len(marker)
        next_marker = markers[i + 1] if i < len(markers) - 1 else None
        end = remaining.find(next_marker) if next_marker else len(remaining)
        if end == -1:
            end = len(remaining)

        sections[marker] = clean_text(remaining[start:end].strip())
        remaining = remaining[end:]

    return sections


def parse_prereq_coreq(text, clean_text):
    """Extract prerequisites and corequisites from text."""
    patterns = {
        "both": r'previously\s+or\s+concurrently[: ]+([A-Z]{4}\s+\d{3}[^.]*)',
        "pre": r'previously[: ]+([^.]*)',
        "co": r'concurrently[: ]+([A-Z]{4}\s+\d{3}[^.]*)',
    }

    prereq = coreq = ""
    if (match := re.search(patterns["both"], text, re.I)):
        prereq = coreq = clean_text(match.group(1) + '.')
    elif (match := re.search(patterns["pre"], text, re.I)):
        prereq = clean_text(match.group(1) + '.')
    elif (match := re.search(patterns["co"], text, re.I)):
        coreq = clean_text(match.group(1) + '.')
    else:
        cleaned = re.sub(r'(previously|or concurrently)[: ]+', '', text, flags=re.I)
        prereq = clean_text(cleaned)

    if prereq:
        prereq = re.sub(r'\s{0,5}or\s{0,5}', ' / ', prereq, flags=re.I)

    return prereq, coreq

def make_prereq_coreq_into_array(s):
    tokens = re.findall(r"[A-Za-z]{4} \d{3}", s)

    if not tokens:
        return []

    placeholder = "§"
    temp = s
    for t in tokens:
        temp = temp.replace(t, placeholder, 1)

    comma_groups = temp.split(",")

    result = []
    token_index = 0

    for group in comma_groups:
        slash_parts = group.split("/")
        inner_list = []
        for _ in slash_parts:
            if token_index < len(tokens):
                inner_list.append(tokens[token_index])
                token_index += 1
        if inner_list:
            result.append(inner_list)

    return result

def get_not_taken(s):

    if "may not take this course for credit" not in s:
        return []
    
    tokens = re.findall(r"[A-Za-z]{4} \d{3}", s)
    return tokens

def extract_course_data(course_code, url):
    """Extract structured course data (id, title, credits, prereqs, etc.) from a course catalog page."""
    soup = fetch_html(url)
    if not soup:
        return None

    for block in soup.find_all('div', class_='course'):
        title_el = block.find('h3', class_='accordion-header xlarge')
        if not title_el:
            continue

        title_text = ' '.join(title_el.stripped_strings)
        course_id, title, course_credits = parse_title_and_credits(title_text, clean_text)

        if course_id != course_code and course_code != "ANY":
            continue

        content_el = block.find('div', class_='accordion-body')
        full_text = clean_text(' '.join(content_el.stripped_strings)) if content_el else ""

        sections = split_sections(full_text, clean_text)
        raw_prereq_coreq = sections.get("Prerequisite/Corequisite:", "")
        prereq, coreq = parse_prereq_coreq(raw_prereq_coreq, clean_text)

        course={
            "_id":course_id,
            "code": course_id,
            "title": title,
            "credits": course_credits,
            "description": sections.get("Description:", ""),
            "offeredIN": [""],
            "prerequisites/corequisites": raw_prereq_coreq,
            "rules":{
                "prereq":make_prereq_coreq_into_array(prereq),
                "coreq":make_prereq_coreq_into_array(coreq),
                "not_taken": get_not_taken(sections.get("Notes:", ""))
            }
        }

        if course_code == 'ANY':
            courses.append(course)
        else:
            return course
    if course_code == 'ANY':
        return courses
    else:
        return None