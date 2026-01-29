from bs4 import BeautifulSoup
from bs4.dammit import EncodingDetector
import requests
import re
from .concordia_api_utils import get_instance


#----------------------------------
#There is code for scraping course data in course data/ Scraping. It might be duplicated with this file.
#This scraper includes function for cleaning and normalizing text with proper spacing.
#----------------------------------

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
        end = len(remaining)  # Default to end of text
        
        # Look for any remaining markers to find the actual end
        for j in range(i + 1, len(markers)):
            next_marker_pos = remaining.find(markers[j])
            if next_marker_pos != -1 and next_marker_pos < end:
                end = next_marker_pos

        sections[marker] = clean_text(remaining[start:end].strip())
        remaining = remaining[end:]

    return sections

def extract_prereq_coreq_from_sentence(sentences, clean_text):
    prereq_parts = []
    coreq_parts = []
    patterns = [
        # (pattern, action)
        (r'must be completed? previously or concurrently[: ]+([^.]+)', lambda m: (m, m)),
        (r'must be completed? previously[: ]+([^.]+)', lambda m: (m, None)),
        (r'must be completed? concurrently[: ]+([^.]+)', lambda m: (None, m)),
        (r'by passing ([A-Z]{4}\s+\d{3})', lambda m: (m, None)),
        (r'must complete.*?including the following courses?[: ]+([^.]+)', lambda m: (m, None)),
    ]
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        for pat, act in patterns:
            match = re.search(pat, sentence, re.I)
            if match:
                course_text = clean_text(match.group(1))
                if course_text:
                    prereq_val, coreq_val = act(course_text)
                    if prereq_val:
                        prereq_parts.append(prereq_val)
                    if coreq_val:
                        coreq_parts.append(coreq_val)
                break
    return prereq_parts, coreq_parts
    
def parse_prereq_coreq(text, clean_text):
    """Extract prerequisites and corequisites from text."""
    if not text:
        return "", ""
    
    # Clean the text first
    text = clean_text(text)
        
    # Split the text by sentences (periods followed by capital letters or end)
    sentences = re.split(r'\.\s*(?=[A-Z]|$)', text)
    prereq_parts, coreq_parts = extract_prereq_coreq_from_sentence(sentences, clean_text)
 
    # if no previously/concurrently patterns found, assume all are prerequisites
    if not prereq_parts and not coreq_parts:
        # Avoid adding eligibility statements as prerequisites (see ENGR 490)
        if not re.search(r'must be eligible to register in[: ]+([^:]+)', text, re.I):
            prereq_parts.append(text)

    # Join all parts with semicolons to separate different requirements
    prereq = "; ".join(prereq_parts)
    coreq = "; ".join(coreq_parts)
    
    return prereq.strip(), coreq.strip()

# Handle patterns like "ELEC 342 or 364" - expand to "ELEC 342 or ELEC 364"
def expand_course_shorthand(match):
    full_course = match.group(1)  # e.g., "ELEC 342"
    dept = full_course[:4]        # e.g., "ELEC"
    number_only = match.group(2)  # e.g., "364"
    return f"{full_course} or {dept} {number_only}"

def make_prereq_coreq_into_array(s):
    if not s or not s.strip():
        return []
        
    s = re.sub(r'([A-Z]{4}\s+\d{3})\s+or\s+(\d{3})', expand_course_shorthand, s)
    
    # Split by semicolons first (main separators between different requirements)
    main_groups = [group.strip() for group in s.split(';') if group.strip()]
    
    result = []
    
    for main_group in main_groups:
        # Extract all valid course codes (4 uppercase letters + space + 3 digits) from this group
        course_pattern = r'[A-Z]{4}\s+\d{3}'
        all_courses = re.findall(course_pattern, main_group)
        
        if not all_courses:
            continue
        
        # Check if this group contains 'or' keywords (alternatives)
        if re.search(r'\bor\b', main_group, re.I):
            # Split by 'or' to find alternatives
            or_parts = re.split(r'\s+or\s+', main_group, flags=re.I)
            alternatives = []
            
            for part in or_parts:
                # Find courses in this part
                part_courses = re.findall(course_pattern, part)
                alternatives.extend(part_courses)
            
            if alternatives:
                # Remove duplicates while preserving order
                unique_alternatives = []
                for alt in alternatives:
                    if alt not in unique_alternatives:
                        unique_alternatives.append(alt)
                result.append(unique_alternatives)
        else:
            # No 'or' in this group - check if comma-separated individual requirements
            if ',' in main_group:
                # Split by commas for individual requirements
                comma_parts = [part.strip() for part in main_group.split(',') if part.strip()]
                for part in comma_parts:
                    part_courses = re.findall(course_pattern, part)
                    for course in part_courses:
                        result.append([course])
            else:
                # Single requirement or multiple courses in same requirement
                for course in all_courses:
                    result.append([course])
    
    return result

def get_not_taken(s):
    if "not take this course for credit" not in s:
        return []
    
    tokens = re.findall(r'[A-Z]{4}\s+\d{3}', s)
    return tokens

def extract_course_data(course_code, url):
    """Extract structured course data (id, title, credits, prereqs, etc.) from a course catalog page."""
    soup = fetch_html(url)
    if not soup:
        return None

    parsed_courses = []
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

        apiu = get_instance()
        course={
            "_id":course_id,
            "code": course_id,
            "title": title,
            "credits": course_credits,
            "description": sections.get("Description:", ""),
            "offeredIn": apiu.get_term(course_id),
            "prereqCoreqText": raw_prereq_coreq,
            "rules":{
                "prereq":make_prereq_coreq_into_array(prereq),
                "coreq":make_prereq_coreq_into_array(coreq),
                "not_taken": get_not_taken(sections.get("Notes:", ""))
            }
        }
        if course_code == 'ANY':
            parsed_courses.append(course)
        else:
            return course
    if course_code == 'ANY':
        return parsed_courses
    else:
        return None

def get_coop_courses():
    return [
        {
            "_id":"CWT 100",
            "code": "CWT 100",
            "title": "COOP Work Term 1",
            "credits": 0,
            "description": "COOP Work Term 1",
            "offeredIn": ["Fall", "Winter", "Summer"],
            "prereqCoreqText": "",
            "rules":{
                "prereq":[],
                "coreq":[],
                "not_taken": []
            }
        },
        {
            "_id":"CWT 101",
            "code": "CWT 101",
            "title": "Reflective Learning I",
            "credits": 0,
            "description": "Reflective Learning I",
            "offeredIn": ["Fall", "Winter", "Summer"],
            "prereqCoreqText": "",
            "rules":{
                "prereq":[],
                "coreq":[],
                "not_taken": []
            }
        },
        {
            "_id":"CWT 200",
            "code": "CWT 200",
            "title": "COOP Work Term 2",
            "credits": 0,
            "description": "COOP Work Term 2",
            "offeredIn": ["Fall", "Winter", "Summer"],
            "prereqCoreqText": "",
            "rules":{
                "prereq":[["CWT 100"]],
                "coreq":[],
                "not_taken": []
            }
        },
        {
            "_id":"CWT 201",
            "code": "CWT 201",
            "title": "Reflective Learning II",
            "credits": 0,
            "description": "Reflective Learning II",
            "offeredIn": ["Fall", "Winter", "Summer"],
            "prereqCoreqText": "",
            "rules":{
                "prereq":[["CWT 101"]],
                "coreq":[],
                "not_taken": []
            }
        },
        {
            "_id":"CWT 300",
            "code": "CWT 300",
            "title": "COOP Work Term 3",
            "credits": 0,
            "description": "COOP Work Term 3",
            "offeredIn": ["Fall", "Winter", "Summer"],
            "prereqCoreqText": "",
            "rules":{
                "prereq":[["CWT 200"]],
                "coreq":[],
                "not_taken": []
            }
        },
        {
            "_id":"CWT 301",
            "code": "CWT 301",
            "title": "Reflective Learning III",
            "credits": 0,
            "description": "Reflective Learning III",
            "offeredIn": ["Fall", "Winter", "Summer"],
            "prereqCoreqText": "",
            "rules":{
                "prereq":[["CWT 201"]],
                "coreq":[],
                "not_taken": []
            }
        }
    ]