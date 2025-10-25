from bs4 import BeautifulSoup
from bs4.dammit import EncodingDetector
import json
import requests
import re
import sys

#Arguments
#argv[1] is the url of the page to be scraped for course data
#argv[2] is for the name of the output file

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

def extract_course_data(course, url):
    """Extract structured course data (id, title, credits, prereqs, etc.) from a course catalog page."""

    def fetch_html(url):
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

    def parse_title_and_credits(title_text):
        """Extract course ID, title, and credits from the header text."""
        match = re.match(r'^([A-Z]{4}\s*\d+)\s+([^()]+?)\s*\(\s*([0-9]+(?:\.[0-9]+)?)\s*credits\s*\)$', title_text)
        if match:
            course_id = clean_text(match.group(1))
            title = clean_text(match.group(2))
            credit_str = match.group(3)
            course_credits = float(credit_str) if '.' in credit_str else int(credit_str)
        else:
            course_id, title, course_credits = None, clean_text(title_text), None
        return course_id, title, course_credits

    def split_sections(text):
        """Split text into known labeled sections."""
        markers = ["Prerequisite/Corequisite:", "Description:", "Component(s):", "Notes:"]
        sections, remaining = {}, text
        for i, marker in enumerate(markers):
            start = remaining.find(marker)
            if start == -1:
                sections[marker] = ""
                continue
            start += len(marker)
            end = remaining.find(markers[i + 1]) if i < len(markers) - 1 else len(remaining)
            if end == -1:
                end = len(remaining)
            sections[marker] = clean_text(remaining[start:end].strip())
            remaining = remaining[end:]
        return sections

    def parse_prereq_coreq(text):
        """Extract prerequisites and corequisites from combined text."""
        prereq, coreq = "", ""
        both = re.search(r'previously\s+or\s+concurrently[: ]+([A-Z]{4}\s+\d{3}[^.]*)', text, re.I)
        pre = re.search(r'previously[: ]+([^.]*)', text, re.I)
        co = re.search(r'concurrently[: ]+([A-Z]{4}\s+\d{3}[^.]*)', text, re.I)

        if both:
            prereq = coreq = clean_text(both.group(1) + '.')
        elif pre:
            prereq = clean_text(pre.group(1) + '.')
        elif co:
            coreq = clean_text(co.group(1) + '.')
        else:
            cleaned = re.sub(r'(previously|or concurrently)[: ]+', '', text, flags=re.I)
            prereq = clean_text(cleaned)

        if prereq:
            prereq = re.sub(r'\s{0,5}or\s{0,5}', ' / ', prereq, flags=re.I)

        return prereq, coreq

    # --- Main Logic ---
    soup = fetch_html(url)
    if not soup:
        return None

    for block in soup.find_all('div', class_='course'):
        try:
            title_el = block.find('h3', class_='accordion-header xlarge')
            if not title_el:
                continue

            title_text = ' '.join(title_el.stripped_strings)
            course_id, title, course_credits = parse_title_and_credits(title_text)
            if course_id != course:
                continue

            content_el = block.find('div', class_='accordion-body')
            full_text = clean_text(' '.join(content_el.stripped_strings)) if content_el else ""
            sections = split_sections(full_text)

            prereq, coreq = parse_prereq_coreq(sections.get("Prerequisite/Corequisite:", ""))
            course_data = {
                "id": course_id,
                "title": title,
                "credits": course_credits,
                "description": sections.get("Description:", ""),
                "offeredIN": [""],
                "prerequisites": prereq,
                "corequisites": coreq,
            }
            return course_data

        except Exception as e:
            print(f"Error processing course block: {e}")

    return None