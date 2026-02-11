import sys
import os
import re
from unidecode import unidecode

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from models import CourseRules

SPACE_REPLACEMENT = r'\1 \2'
REGEX_ALL = r".*"
REGEX_NONE = r"a^"  # regex to match nothing
TITLE_REGEX = r"^(.*)\((\d+(?:\.\d+)?) credits\)"
COURSE_REGEX = r'[A-Z]{3,4}\s+\d{3}'
CATALOG_COURSE_TITLE_REGEX = rf'^({COURSE_REGEX})\s+(.+?)\s*\(\s*(\d+(?:\.\d+)?)\s*credits\s*\)$'
EM_DASH_PLACEHOLDER = "EM_DASH"

# Helper functions for parsing course data
def clean_text(text):
    if not text:
        return ""

    text = re.sub(r'\s+', ' ', text)  # Collapse multiple spaces into one
    # Fix specific degree abbreviations
    text = text.replace('B Eng', 'BEng')
    text = text.replace('B Comp Sc', 'BCompSc')
    text = re.sub(r'([a-zA-Z])(\d)', SPACE_REPLACEMENT, text)  # Space between letters and numbers
    text = re.sub(r'(\d)([a-zA-Z])', SPACE_REPLACEMENT, text)  # Space between numbers and letters
    text = text.replace('–', EM_DASH_PLACEHOLDER)  # Temporarily replace em-dash
    text = unidecode(text) # Convert ALL unicode characters to ASCII equivalents
    text = text.replace(EM_DASH_PLACEHOLDER, '–')  # Restore em-dash
    text = text.replace("--", "–")  # Replace double hyphens with em-dash
    text = re.sub(r'(\d+)\s*\.\s*(?=\d)', r'\1.', text)  # Remove spaces around dots when followed by digits
    # Single space after punctuation, but exclude dots between numbers
    text = re.sub(r'\s*([,:;])\s*', r'\1 ', text)  # Comma, colon, semicolon
    text = re.sub(r'\s*(\.)(?!\d)\s*', r'\1 ', text)  # Dot not followed by digit
    text = re.sub(r'\s+', ' ', text.strip())  # Final cleanup
    return text

def extract_name_and_credits(title_element):
    """
    Extract name and total credits from a title element
    expected format: 'Program Name (120 credits)' or 'Course Pool Name (15 credits)' or similar pattern
    """
    if not title_element:
        return None, 0
    
    title_text = "".join(title_element.stripped_strings)
    match = re.match(TITLE_REGEX, title_text)
    if match:
        name = match.group(1).strip()
        total_credits = float(match.group(2)) if '.' in match.group(2) else int(match.group(2))
        return name, total_credits
    else:
        return clean_text(title_text), 0

def parse_course_title_and_credits(title_element):
    """
    Extract course ID, title, and credits from the header text
    example: 'ELEC 342 Digital Systems Design (3 credits)' or 'BTM 200 Fundamentals of Information Technology (3 credits)'
    """
    name, course_credits = extract_name_and_credits(title_element)
    course_id_match = re.match(COURSE_REGEX, name)
    if course_id_match:
        course_id = course_id_match.group(0)
        title = name[len(course_id):].strip()
        return course_id, clean_text(title), float(course_credits)
    return None, name, float(course_credits)

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

# Handle patterns like "ELEC 342 or 364" - expand to "ELEC 342 or ELEC 364"
def expand_course_shorthand(match):
    full_course = match.group(1)  # e.g., "ELEC 342"
    dept = full_course[:4]        # e.g., "ELEC"
    number_only = match.group(2)  # e.g., "364"
    return f"{full_course} or {dept} {number_only}"

def extract_prereq_coreq_from_sentence(sentences):
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
    
def parse_prereq_coreq(text):
    """Extract prerequisites and corequisites from text."""
    if not text:
        return "", ""
        
    # Split the text by sentences (periods followed by capital letters or end)
    sentences = re.split(r'\.\s*(?=[A-Z]|$)', text)
    prereq_parts, coreq_parts = extract_prereq_coreq_from_sentence(sentences)
 
    # if no previously/concurrently patterns found, assume all are prerequisites
    if not prereq_parts and not coreq_parts:
        # Avoid adding eligibility statements as prerequisites (see ENGR 490)
        if not re.search(r'must be eligible to register in[: ]+([^:]+)', text, re.I):
            prereq_parts.append(text)

    # Join all parts with semicolons to separate different requirements
    prereq = "; ".join(prereq_parts)
    coreq = "; ".join(coreq_parts)
    
    return prereq.strip(), coreq.strip()

def make_prereq_coreq_into_array(s):
    if not s or not s.strip():
        return []

    s = re.sub(rf'({COURSE_REGEX})\s+or\s+(\d{3})', expand_course_shorthand, s)
    
    # Split by semicolons first (main separators between different requirements)
    main_groups = [group.strip() for group in s.split(';') if group.strip()]
    
    result = []
    
    for main_group in main_groups:
        all_courses = re.findall(COURSE_REGEX, main_group)
        
        if not all_courses:
            continue
        
        # Check if this group contains 'or' keywords (alternatives)
        if re.search(r'\bor\b', main_group, re.I):
            # Split by 'or' to find alternatives
            or_parts = re.split(r'\s+or\s+', main_group, flags=re.I)
            alternatives = []
            
            for part in or_parts:
                # Find courses in this part
                part_courses = re.findall(COURSE_REGEX, part)
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
                    part_courses = re.findall(COURSE_REGEX, part)
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
    
    tokens = re.findall(COURSE_REGEX, s)
    return tokens

def parse_course_rules(prereq_coreq_text: str, notes_text: str) -> CourseRules:
    prereq, coreq = parse_prereq_coreq(prereq_coreq_text)
    return CourseRules(
        prereq=make_prereq_coreq_into_array(prereq),
        coreq=make_prereq_coreq_into_array(coreq),
        not_taken=get_not_taken(notes_text)
    )

def parse_course_components(component_text: str) -> list[str]:
    if not component_text:
        return []
    
    components = [comp.strip() for comp in component_text.split(';') if comp.strip()]
    return components

def get_course_sort_key(course_id: str):
    match = re.match(r'([A-Z]{3,4})\s+(\d{3})', course_id)
    if match:
        dept = match.group(1)
        num = int(match.group(2))
        return (dept, num)
    return ("", float('inf'))
