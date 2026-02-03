from bs4 import BeautifulSoup
from urllib.parse import urljoin
from .web_utils import WebUtils
import re
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from models.course import BS4Output, Course, CourseRules

webu = WebUtils()

def _process_multiple_links(links: list, base_url: str) -> list[dict]:
    """Process multiple links in a single li element."""
    results = []
    for link in links:
        link_text = " ".join(link.stripped_strings)
        if link_text:
            results.append({
                "text": link_text,
                "url": urljoin(base_url, link["href"])
            })
    return results

def _process_single_or_no_links(li, links: list, base_url: str) -> dict:
    """Process li element with single link or no links."""
    text = " ".join(li.stripped_strings)
    if not text:
        return None
        
    url = urljoin(base_url, links[0]["href"]) if links else None
    return {"text": text, "url": url}

def get_list_from_div(url: str, div_class: list[str]) -> list[BS4Output]:
    html = webu.fetch_html(url)
    soup = BeautifulSoup(html, "html.parser")

    results = []
    divs = soup.find_all("div", class_=div_class)

    for div in divs:
        for list_element in div.find_all(["ul", "ol"]):
            for li in list_element.find_all("li", recursive=False):
                links = li.find_all("a", href=True)
                
                if len(links) > 1:
                    results.extend(_process_multiple_links(links, url))
                else:
                    result = _process_single_or_no_links(li, links, url)
                    if result:
                        results.append(result)

    return results

# Helper functions for parsing course data
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
    text = text.replace('\u00e2\u0080\u0091', '-')  # Another non-breaking hyphen to regular hyphen
    text = re.sub(r'\s*([.,:;])\s*', r'\1 ', text)  # Single space after punctuation
    text = re.sub(r'\s+', ' ', text.strip())  # Final cleanup
    return text

def parse_title_and_credits(title_text):
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

def split_sections(text):
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

def extract_courses(catalog: str, url: str) -> list[Course]:
    html = webu.fetch_html(url)
    soup = BeautifulSoup(html, "html.parser")

    courses = []

    course_tree = soup.find("div", class_="ccms-course-tree")
    if not course_tree:
        return courses

    course_divs = course_tree.find_all("div", class_="course")

    catalog_lower = catalog.lower()
    for div in course_divs:
        title_element = div.find('h3', class_='accordion-header xlarge')
        if not title_element:
            continue
            
        title_text = ' '.join(title_element.stripped_strings)
        
        # Parse the title to extract course info
        course_id, title, course_credits = parse_title_and_credits(title_text)
        
        # Check if this course matches the catalog filter
        if not course_id or not course_id.lower().startswith(catalog_lower):
            continue
        
        # Get the course content for description and prereq/coreq
        content_div = div.find('div', class_='accordion-body')
        full_text = clean_text(' '.join(content_div.stripped_strings)) if content_div else ""
        
        sections = split_sections(full_text)
        
        # Create Course object
        course = Course(
            _id=course_id,
            title=title,
            credits=course_credits or 0,
            description=clean_text(sections.get("Description:", "")),
            offered_in=[],
            prereq_coreq_text=clean_text(sections.get("Prerequisite/Corequisite:", "")),
            rules=CourseRules()
        )

        courses.append(course)

    return courses