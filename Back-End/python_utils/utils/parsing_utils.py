import sys
import os
import re
from unidecode import unidecode

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from models import (Constraint, ConstraintType,
                    MinCoursesFromSetParams, MaxCoursesFromSetParams,
                    CourseAdditionParams, CourseRemovalParams, CourseSubstitutionParams, MinCreditsCompletedParams,
                    OverrideCoursePoolCoursesParams)

SPACE_REPLACEMENT = r'\1 \2'
REGEX_ALL = r".*"
REGEX_NONE = r"a^"  # regex to match nothing
TITLE_REGEX = r"^(.*)\((\d+(?:\.\d+)?) credits\)"
COURSE_REGEX = r'[A-Z]{3,4}\s+\d{3,4}'
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

    # Expand course shorthands iteratively to handle multiple consecutive cases
    pattern = r'(' + COURSE_REGEX + r')\s+or\s+(\d{3})'
    while True:
        new_s = re.sub(pattern, expand_course_shorthand, s)
        if new_s == s:  # No changes made
            break
        s = new_s
    
    # Split by semicolons first (main separators between different requirements)
    main_groups = [group.strip() for group in s.split(';') if group.strip()]
    
    result = []
    
    for main_group in main_groups:
        all_courses = re.findall(COURSE_REGEX, main_group)

        if not all_courses:
            continue

        # Split by commas first to separate distinct requirements
        comma_parts = [part.strip() for part in main_group.split(',') if part.strip()]

        for comma_part in comma_parts:
            part_courses = re.findall(COURSE_REGEX, comma_part)

            if not part_courses:
                continue

            # Check if this part contains 'or' keywords (alternatives within this requirement)
            if re.search(r'\bor\b', comma_part, re.I):
                # Split by 'or' to find alternatives
                or_parts = re.split(r'\s+or\s+', comma_part, flags=re.I)
                alternatives = []

                for or_part in or_parts:
                    # Find courses in this part
                    or_part_courses = re.findall(COURSE_REGEX, or_part)
                    alternatives.extend(or_part_courses)

                if alternatives:
                    # Remove duplicates while preserving order
                    unique_alternatives = []
                    for alt in alternatives:
                        if alt not in unique_alternatives:
                            unique_alternatives.append(alt)
                    result.append(unique_alternatives)
            else:
                # No 'or' in this part - each course is a separate requirement
                for course in part_courses:
                    result.append([course])
    
    return result

def make_requisite_arrays(prereq_text, coreq_text) -> tuple[list[str], list[str], list[str]]:
    prereq = make_prereq_coreq_into_array(prereq_text)
    coreq = make_prereq_coreq_into_array(coreq_text)
    pre_coreq = []
    # Find courses that appear in both prereq and coreq lists
    for p in prereq:
        for c in coreq:
            if set(p) & set(c):  # If there's any overlap in courses
                pre_coreq.append(list(set(p) & set(c)))  # Add the overlapping courses to pre_coreq
                # Remove the overlapping courses from prereq and coreq
                p[:] = [course for course in p if course not in pre_coreq[-1]]
                c[:] = [course for course in c if course not in pre_coreq[-1]]
    # Remove empty lists from prereq and coreq
    prereq = [p for p in prereq if p]
    coreq = [c for c in coreq if c]
    return prereq, coreq, pre_coreq

def get_not_taken(s):
    if "not take this course for credit" not in s:
        return []
    
    tokens = re.findall(COURSE_REGEX, s)
    # remove duplicates while preserving order
    seen = set()
    tokens = [x for x in tokens if not (x in seen or seen.add(x))]
    return tokens

def parse_minimum_credits(s):
    match = re.search(r'Students must (?:have )?complet(?:e|ed) (?:(?:a )?minimum (?:of )?)?(\d+(?:\.\d+)?) credits', s, re.I)
    if match:
        return float(match.group(1))
    return 0.0

def parse_course_rules(prereq_coreq_text: str, notes_text: str) -> list[Constraint]:
    prereq_text, coreq_text = parse_prereq_coreq(prereq_coreq_text)

    prereq, coreq, pre_coreq = make_requisite_arrays(prereq_text, coreq_text)
    not_taken_list=get_not_taken(notes_text)
    min_credits=parse_minimum_credits(prereq_coreq_text)

    constraints = []
    if prereq:
        for group in prereq:
            constraints.append(Constraint(
                type=ConstraintType.PREREQUISITE,
                params=MinCoursesFromSetParams(courseList=group, minCourses=1),
                message="At least 1 of the following courses must be completed previously: " + ", ".join([", ".join(group)]) + "."
            ))
    
    if coreq:
        for group in coreq:
            constraints.append(Constraint(
                type=ConstraintType.COREQUISITE,
                params=MinCoursesFromSetParams(courseList=group, minCourses=1),
                message="At least 1 of the following courses must be taken concurrently: " + ", ".join([", ".join(group)]) + "."
            ))
    
    if pre_coreq:
        for group in pre_coreq:
            constraints.append(Constraint(
                type=ConstraintType.PREREQUISITE_OR_COREQUISITE,
                params=MinCoursesFromSetParams(courseList=group, minCourses=1),
                message="At least 1 of the following courses must be completed previously or taken concurrently: " + ", ".join([", ".join(group)]) + "."
            ))
    
    if not_taken_list:
        constraints.append(Constraint(
            type=ConstraintType.NOT_TAKEN,
            params=MaxCoursesFromSetParams(courseList=not_taken_list, maxCourses=0),
            message="Students cannot take this course if they have taken any of the following courses: " + ", ".join(not_taken_list) + "."
        ))
    
    if min_credits > 0:
        constraints.append(Constraint(
            type=ConstraintType.MIN_CREDITS,
            params=MinCreditsCompletedParams(minCredits=min_credits),
            message=f"Students must complete at least {min_credits} credits before taking this course."
        ))
    
    return constraints

def parse_course_components(component_text: str) -> list[str]:
    if not component_text:
        return []
    
    components = [comp.strip() for comp in component_text.split(';') if comp.strip()]
    return components

def get_course_sort_key(course_id: str):
    match = re.fullmatch(r'([A-Z]{3,4})\s+(\d{3,4})', course_id.strip())
    if match:
        dept = match.group(1)
        course_num = match.group(2)
        num = int(course_num)
        # Group by the first 3 digits so 4-digit variants sort between base and next base (e.g. 308 < 3081 < 309).
        base_num = int(course_num[:3])
        return (dept, base_num, len(course_num), num)
    return ("", float('inf'), float('inf'), float('inf'))

_WORD_TO_NUM: dict[str, int] = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
}

# Helpers for BEng degree matching used in parse_coursepool_rules
_BENG_SINGLE_RE = r'(?:(?:the\s+)?BEng in \w+ Engineering)'
_BENG_LIST_RE = (
    r'((?:the\s+)?BEng in \w+ Engineering'
    r'(?:\s*,\s*' + _BENG_SINGLE_RE + r')*'
    r'(?:\s+and\s+' + _BENG_SINGLE_RE + r')?)'
)


def _word_or_num_to_int(s: str) -> int:
    """Convert a word (e.g. 'three') or digit string to an integer."""
    s = s.strip().lower()
    if s in _WORD_TO_NUM:
        return _WORD_TO_NUM[s]
    try:
        return int(s)
    except ValueError:
        return 1


def parse_coursepool_rules(coursepool_notes: str) -> list[Constraint]:
    """
    Parses rule/note text extracted from a course pool page into a list of Constraint objects.

    Supported patterns
    ------------------
    1. Replace pattern
       "Students may replace DEPT NNN with DEPT NNN"
       → MAX_COURSES_FROM_SET(courseList=[A, B], maxCourses=1)

    2. No more than one of the following courses (inline list)
       "Students may take no more than one of the following courses: A, B, ..."
       → MAX_COURSES_FROM_SET(courseList=[...], maxCourses=1)

    3. Cannot receive credit for both
       "Students cannot receive credit for both A and B; C and D; ..."
       → one MAX_COURSES_FROM_SET per semicolon-separated pair

    4a. Must take at least N courses from the following list (with bullets or inline)
        "Students must take at least <N|word> courses from the following list: ..."
        → MIN_COURSES_FROM_SET(courseList=[...], minCourses=N)

    4b. May take no more than N course(s) from the following list
        "Students may take no more than <N|word> course(s) from the following list: ..."
        → MAX_COURSES_FROM_SET(courseList=[...], maxCourses=N)

    5. Degree-specific course removal
       "students in the BEng in X Engineering[, BEng in Y Engineering ...] ... are not required to take DEPT NNN"
       → one COURSE_REMOVAL per degree in the list

    6a. Degree-specific course substitution (mandatory)
        "Students in [the] BEng in X Engineering [and ...] shall replace DEPT NNN with DEPT MMM"
        → one COURSE_SUBSTITUTION per degree in the list

    6b. Degree-specific optional course substitution
        "Students in [the] BEng in X Engineering may replace DEPT NNN with DEPT MMM"
        → COURSE_ADDITION(new course, degreeId) + MAX_COURSES_FROM_SET([old, new], 1) per degree

    7. Degree-specific course pool override (elective)
       "Students in [the] BEng in X Engineering shall take DEPT NNN as their ... elective"
       → OVERRIDE_COURSEPOOL_COURSES(coursePoolId=GENERAL_ELECTIVES, newCourseList=[DEPT NNN], degreeId=degree)

    Args:
        coursepool_notes (str): Text extracted from the course pool div.

    Returns:
        list[Constraint]: Parsed constraints.
    """
    if not coursepool_notes or not coursepool_notes.strip():
        return []

    constraints: list[Constraint] = []

    # ------------------------------------------------------------------ #
    # Pattern 1 – "Students may replace X with Y"                         #
    # ------------------------------------------------------------------ #
    replace_re = re.compile(
        r'Students may replace\s+(' + COURSE_REGEX + r')\s+with\s+(' + COURSE_REGEX + r')',
        re.I
    )
    for m in replace_re.finditer(coursepool_notes):
        a, b = m.group(1).strip(), m.group(2).strip()
        constraints.append(Constraint(
            type=ConstraintType.MAX_COURSES_FROM_SET,
            params=MaxCoursesFromSetParams(courseList=[a, b], maxCourses=1),
            message=f"Students may replace {a} with {b}."
        ))

    # ------------------------------------------------------------------ #
    # Pattern 2 – "no more than one of the following courses: A, B, ..." #
    # ------------------------------------------------------------------ #
    no_more_one_of_re = re.compile(
        r'Students may take no more than one of the following courses?\s*:\s*([^.]+)',
        re.I
    )
    for m in no_more_one_of_re.finditer(coursepool_notes):
        courses = re.findall(COURSE_REGEX, m.group(1))
        if courses:
            msg = "Students may take no more than one of the following courses: " + ", ".join(courses) + "."
            constraints.append(Constraint(
                type=ConstraintType.MAX_COURSES_FROM_SET,
                params=MaxCoursesFromSetParams(courseList=courses, maxCourses=1),
                message=msg
            ))

    # ------------------------------------------------------------------ #
    # Pattern 3 – "cannot receive credit for both A and B; C and D"      #
    # ------------------------------------------------------------------ #
    cannot_credit_re = re.compile(
        r'Students cannot receive credit for both\s+(.+?)(?=\.\s|$)',
        re.I | re.DOTALL
    )
    for m in cannot_credit_re.finditer(coursepool_notes):
        for pair_text in m.group(1).split(';'):
            pair_text = pair_text.strip()
            courses = re.findall(COURSE_REGEX, pair_text)
            if len(courses) >= 2:
                msg = "Students may take no more than one of the following courses: " + ", ".join(courses) + "."
                constraints.append(Constraint(
                    type=ConstraintType.MAX_COURSES_FROM_SET,
                    params=MaxCoursesFromSetParams(courseList=courses, maxCourses=1),
                    message=msg
                ))

    # ------------------------------------------------------------------ #
    # Pattern 4a – "must take at least N courses from the following list" #
    # ------------------------------------------------------------------ #
    min_courses_re = re.compile(
        r'Students must take at least\s+([a-z]+|\d+)\s+courses?\s+from the following list\s*:\s*'
        r'(.+?)(?=Students (?:must|may) take|\Z)',
        re.I | re.DOTALL
    )
    for m in min_courses_re.finditer(coursepool_notes):
        count_str = m.group(1)
        courses = sorted(re.findall(COURSE_REGEX, m.group(2)), key=get_course_sort_key)
        if courses:
            min_count = _word_or_num_to_int(count_str)
            msg = (f"Students must take at least {count_str} courses from the following list: "
                   + ", ".join(courses) + ".")
            constraints.append(Constraint(
                type=ConstraintType.MIN_COURSES_FROM_SET,
                params=MinCoursesFromSetParams(courseList=courses, minCourses=min_count),
                message=msg
            ))

    # ------------------------------------------------------------------ #
    # Pattern 4b – "may take no more than N course(s) from the following" #
    # ------------------------------------------------------------------ #
    max_courses_list_re = re.compile(
        r'Students may take no more than\s+([a-z]+|\d+)\s+courses?\s+from the following list\s*:\s*'
        r'(.+?)(?=Students (?:must|may) take|\Z)',
        re.I | re.DOTALL
    )
    for m in max_courses_list_re.finditer(coursepool_notes):
        count_str = m.group(1)
        courses = sorted(re.findall(COURSE_REGEX, m.group(2)), key=get_course_sort_key)
        if courses:
            max_count = _word_or_num_to_int(count_str)
            msg = (f"Students may take no more than {count_str} course from the following list: "
                   + ", ".join(courses) + ".")
            constraints.append(Constraint(
                type=ConstraintType.MAX_COURSES_FROM_SET,
                params=MaxCoursesFromSetParams(courseList=courses, maxCourses=max_count),
                message=msg
            ))

    # ------------------------------------------------------------------ #
    # Pattern 5 – degree-specific course removal                          #
    # "students in [BEng in X, ...] ... are not required to take COURSE" #
    # ------------------------------------------------------------------ #
    not_required_re = re.compile(
        r'students in (?:the\s+)?' + _BENG_LIST_RE +
        r'(?:[^.]|\.\d)*?are not required to take\s+(' + COURSE_REGEX + r')',
        re.I
    )
    for m in not_required_re.finditer(coursepool_notes):
        degrees_text = m.group(1)
        course = re.sub(r'\s+', ' ', m.group(2).strip())
        for degree_id in re.findall(r'BEng in \w+ Engineering', degrees_text, re.I):
            constraints.append(Constraint(
                type=ConstraintType.COURSE_REMOVAL,
                params=CourseRemovalParams(courseId=course, degreeId=degree_id),
                message=f"Students in {degree_id} are not required to take {course}."
            ))

    # ------------------------------------------------------------------ #
    # Pattern 6a – degree-specific course substitution (mandatory)        #
    # "Students in [BEng in X ...] shall replace COURSE_A with COURSE_B" #
    # ------------------------------------------------------------------ #
    shall_replace_re = re.compile(
        r'Students in (?:the\s+)?' + _BENG_LIST_RE +
        r'\s+shall\s+replace\s+(' + COURSE_REGEX + r')\s+with\s+(' + COURSE_REGEX + r')',
        re.I
    )
    for m in shall_replace_re.finditer(coursepool_notes):
        degrees_text = m.group(1)
        old_course = re.sub(r'\s+', ' ', m.group(2).strip())
        new_course = re.sub(r'\s+', ' ', m.group(3).strip())
        for degree_id in re.findall(r'BEng in \w+ Engineering', degrees_text, re.I):
            constraints.append(Constraint(
                type=ConstraintType.COURSE_SUBSTITUTION,
                params=CourseSubstitutionParams(oldCourseId=old_course, newCourseId=new_course, degreeId=degree_id),
                message=f"Students in {degree_id} shall replace {old_course} with {new_course}."
            ))

    # ------------------------------------------------------------------ #
    # Pattern 6b – degree-specific optional substitution                  #
    # "Students in [BEng in X] may replace COURSE_A with COURSE_B"       #
    # → COURSE_ADDITION(new, degreeId) + MAX_COURSES_FROM_SET([old,new]) #
    # ------------------------------------------------------------------ #
    may_replace_re = re.compile(
        r'Students in (?:the\s+)?' + _BENG_LIST_RE +
        r'\s+may\s+replace\s+(' + COURSE_REGEX + r')\s+with\s+(' + COURSE_REGEX + r')',
        re.I
    )
    for m in may_replace_re.finditer(coursepool_notes):
        degrees_text = m.group(1)
        old_course = re.sub(r'\s+', ' ', m.group(2).strip())
        new_course = re.sub(r'\s+', ' ', m.group(3).strip())
        for degree_id in re.findall(r'BEng in \w+ Engineering', degrees_text, re.I):
            constraints.append(Constraint(
                type=ConstraintType.COURSE_ADDITION,
                params=CourseAdditionParams(courseId=new_course, degreeId=degree_id),
                message=f"Students in {degree_id} may replace {old_course} with {new_course}."
            ))
            constraints.append(Constraint(
                type=ConstraintType.MAX_COURSES_FROM_SET,
                params=MaxCoursesFromSetParams(courseList=[old_course, new_course], maxCourses=1),
                message=f"Students may take no more than one of the following courses: {old_course}, {new_course}."
            ))

    # ------------------------------------------------------------------ #
    # Pattern 7 – degree-specific course pool override (elective)        #
    # "Students in [BEng in X] shall take COURSE as their ... elective"  #
    # ------------------------------------------------------------------ #
    _GENERAL_ELECTIVES_POOL_ID = "General Education Humanities and Social Sciences Electives"
    shall_take_elective_re = re.compile(
        r'Students in (?:the\s+)?(BEng in \w+ Engineering)'
        r'\s+shall\s+take\s+(' + COURSE_REGEX + r')\s+as\s+their General Education elective',
        re.I
    )
    for m in shall_take_elective_re.finditer(coursepool_notes):
        degree_id = m.group(1).strip()
        course = re.sub(r'\s+', ' ', m.group(2).strip())
        constraints.append(Constraint(
            type=ConstraintType.OVERRIDE_COURSEPOOL_COURSES,
            params=OverrideCoursePoolCoursesParams(
                coursePoolId=_GENERAL_ELECTIVES_POOL_ID,
                newCourseList=[course],
                degreeId=degree_id
            ),
            message=f"Students in {degree_id} shall take {course} as their General Education elective."
        ))

    return constraints