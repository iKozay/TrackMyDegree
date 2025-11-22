#!/usr/bin/env python3
"""
Python-based transcript parser using PyMuPDF for better PDF parsing.
This script parses academic transcripts and outputs JSON.
"""

import json
import sys
import re
from pathlib import Path
from collections import defaultdict

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF not installed. Run: pip install pymupdf", file=sys.stderr)
    sys.exit(1)


def extract_term_from_text(text):
    """Extract term and year from text like 'Winter 2023' or 'Fall/Winter 2025-26'"""
    pattern = r'^(Winter|Summer|Fall|Spring|Fall/Winter|Winter/Summer)\s+(\d{4}(?:-\d{2})?)$'
    match = re.match(pattern, text.strip())
    if match:
        return {'term': match.group(1), 'year': match.group(2)}
    return None


def is_course_code(text):
    """Check if text looks like a course code (e.g., 'COMP', 'ENGR', 'SOEN')"""
    if not text:
        return False
    text = text.strip()
    # Course codes are typically 2-4 uppercase letters
    if re.match(r'^[A-Z]{2,4}$', text):
        # Exclude common non-course words
        excluded = {'COURSE', 'GRADE', 'GPA', 'AVG', 'SIZE', 'OTHER', 
                   'NOTATION', 'CLASS', 'PROGRAM', 'EARNED', 'EX', 'TRC', 'NA', 
                   'TRANSFER', 'CREDITS', 'ATTEMPTED', 'DESCRIPTION', 'YEAR',
                   'BEGINNING', 'END', 'RECORD', 'WEB', 'PAGE'}
        return text not in excluded
    return False


def is_course_number(text):
    """Check if text looks like a course number (e.g., '232', '249')"""
    if not text:
        return False
    return re.match(r'^\d{3}$', text.strip()) is not None


def is_section(text):
    """Check if text looks like a section code (e.g., 'S', 'EC', 'QQ')"""
    if not text:
        return False
    text = text.strip()
    return re.match(r'^[A-Z0-9]{1,3}$', text) is not None


def is_transfer_credit(course):
    """Check if a course is a transfer credit (EX for exemptions, TRC for transfer credits)
    
    Args:
        course: Dictionary with a 'grade' key
        
    Returns:
        bool: True if grade is 'EX' or 'TRC', False otherwise
    """
    grade = course.get('grade', '').upper()
    return grade == 'EX' or grade == 'TRC'


def parse_transcript(pdf_path):
    """Parse transcript PDF and return unified structured data
    
    Returns:
        dict: ParsedData structure with:
            - programInfo: Program information (degree, terms, coop, etc.)
            - semesters: List of semesters with courses
            - transferedCourses: List of course codes (TRC grades)
            - exemptedCourses: List of course codes (EX grades)
            - deficiencyCourses: List of course codes (empty for transcripts)
    """
    # Initialize result with new unified structure
    result = {
        'deficiencyCourses': []  # Transcripts don't have deficiency courses
    }
    
    # Temporary structures for parsing
    program_history = []
    exempted_courses_set = set()  # EX grades
    transfered_courses_set = set()  # TRC grades
    extended_credit_program = False  # Track if extended credit program is detected
    
    # Track term headers with their positions
    term_headers = []  # List of dicts with page, y, term, year, gpa
    
    # Track all courses with their positions
    all_courses = []  # List of dicts with page, y, course
    
    # Track all term GPAs with their positions
    term_gpas = []  # List of dicts with page, y, gpa_value
    
    doc = fitz.open(pdf_path)
    
    try:
        # Extract student info and program history from first page
        if len(doc) > 0:
            first_page = doc[0]
            first_page_text = first_page.get_text()
            first_page_lines = first_page_text.split('\n') if first_page_text else []
            
            # Extract student information
            student_name = None
            student_id = None
            address_lines = []
            birthdate = None
            permanent_code = None
            telephone = None
            
            i = 0
            while i < len(first_page_lines):
                line = first_page_lines[i].strip()
                
                # Student name (usually on line 1, after "Student Record")
                if line == "Student Record" and i + 1 < len(first_page_lines):
                    student_name = first_page_lines[i + 1].strip()
                    i += 2
                    continue
                
                # Student ID
                if line.startswith("Student ID:"):
                    student_id = line.replace("Student ID:", "").strip()
                    i += 1
                    continue
                
                # Address (lines after Student ID, before Birthdate)
                # Stop collecting address when we hit Birthdate or other known fields
                if student_id and not birthdate and not line.startswith("Birthdate:"):
                    # Check if this looks like an address line (not a header or field name)
                    if (line and 
                        not any(keyword in line for keyword in ["Student ID", "Undergraduate", "Active", "Admit", "Matriculated", "Permanent Code", "Telephone"]) and
                        not line.startswith("Birthdate:")):
                        # Stop if we see the next field coming
                        if i + 1 < len(first_page_lines):
                            next_line = first_page_lines[i + 1].strip()
                            if next_line.startswith("Birthdate:"):
                                # Don't break, just stop adding to address
                                pass
                            else:
                                address_lines.append(line)
                        else:
                            address_lines.append(line)
                    # Continue to next iteration to process Birthdate if it's next
                    i += 1
                    continue
                
                # Birthdate
                if line.startswith("Birthdate:"):
                    birthdate = line.replace("Birthdate:", "").strip()
                    i += 1
                    continue
                
                # Permanent Code
                if line.startswith("Permanent Code:"):
                    permanent_code = line.replace("Permanent Code:", "").strip()
                    i += 1
                    continue
                
                # Telephone
                if line.startswith("Telephone:"):
                    telephone = line.replace("Telephone:", "").strip()
                    i += 1
                    continue
                
                i += 1
            
            # Check for Extended Credit Program in the full first page text
            if 'Extended Credit Program' in first_page_text or 'Extended Credit' in first_page_text:
                extended_credit_program = True
            
            # Extract program history (we'll convert to programInfo later)
            in_program_section = False
            current_program = {}
            
            i = 0
            while i < len(first_page_lines):
                line = first_page_lines[i].strip()
                
                # Start of program history section
                if "Undergraduate Academic Program History" in line or "Program History" in line:
                    in_program_section = True
                    i += 1
                    continue
                
                if not in_program_section:
                    i += 1
                    continue
                
                # Stop at "Beginning of Undergraduate Record" or first term header
                if "Beginning of Undergraduate Record" in line or extract_term_from_text(line):
                    break
                
                # Active in Program date
                if line == "Active in Program" and i + 1 < len(first_page_lines):
                    # If we have a current program, save it
                    if current_program and current_program.get('degreeType'):
                        program_history.append(current_program.copy())
                        current_program = {}
                    
                    date_str = first_page_lines[i + 1].strip()
                    if re.match(r'\d{2}/\d{2}/\d{4}', date_str):
                        current_program['activeDate'] = date_str
                    i += 2
                    continue
                
                # Admit Term
                if line == "Admit Term" and i + 1 < len(first_page_lines):
                    admit_term = first_page_lines[i + 1].strip()
                    term_info = extract_term_from_text(admit_term)
                    if term_info:
                        current_program['admitTerm'] = admit_term
                        current_program['admitYear'] = term_info['year']
                    i += 2
                    continue
                
                # Matriculated
                if line == "Matriculated":
                    current_program['matriculated'] = True
                    i += 1
                    continue
                
                # Degree type (Bachelor of Engineering, etc.)
                if "Bachelor of" in line or "Master of" in line or "Doctor of" in line:
                    # Check if major is on the same line (e.g., "Bachelor of Engineering, Software Engineering")
                    if "," in line:
                        parts = line.split(",", 1)
                        degree_type = parts[0].strip()
                        major = parts[1].strip()
                        current_program['degreeType'] = degree_type
                        current_program['major'] = major
                        # Check for Co-op
                        if "(Co-op)" in major or "COOP" in major.upper() or "(Co-op)" in line:
                            current_program['coop'] = True
                        i += 1
                        continue
                    else:
                        degree_type = line
                        # Check if next line is the major
                        if i + 1 < len(first_page_lines):
                            next_line = first_page_lines[i + 1].strip()
                            # If next line doesn't look like a date or other field, it's likely the major
                            if (not re.match(r'\d{2}/\d{2}/\d{4}', next_line) and 
                                next_line != "Active in Program" and 
                                next_line != "Admit Term" and
                                next_line != "Matriculated" and
                                not next_line.startswith("Min. Credits") and
                                not next_line.startswith("Program Credits") and
                                not next_line.startswith("Cumulative GPA") and
                                not next_line.startswith("Member Institute") and
                                not next_line.startswith("Withdrew Institute")):
                                major = next_line
                                current_program['degreeType'] = degree_type
                                current_program['major'] = major
                                # Check for Co-op
                                if "(Co-op)" in major or "COOP" in major.upper():
                                    current_program['coop'] = True
                                i += 2
                                continue
                        else:
                            current_program['degreeType'] = degree_type
                    i += 1
                    continue
                
                # Member/Withdrew Institute for Co-operative Education
                if "Member Institute for Co-operative Education" in line or "Withdrew Institute for Co-operative Education" in line:
                    if "Member" in line:
                        current_program['coop'] = True
                    elif "Withdrew" in line:
                        current_program['coop'] = False
                    i += 1
                    continue
                
                # Extended Credit Program
                if "Extended Credit Program" in line or "Extended Credit" in line:
                    current_program['extendedCreditProgram'] = True
                    i += 1
                    continue
                
                # Min. Credits Required
                if line.startswith("Min. Credits Required:"):
                    if i + 1 < len(first_page_lines):
                        credits_str = first_page_lines[i + 1].strip()
                        try:
                            current_program['minCreditsRequired'] = float(credits_str)
                        except ValueError:
                            pass
                    i += 2
                    continue
                
                # Program Credits Earned
                if line.startswith("Program Credits Earned:"):
                    if i + 1 < len(first_page_lines):
                        credits_str = first_page_lines[i + 1].strip()
                        try:
                            current_program['programCreditsEarned'] = float(credits_str)
                        except ValueError:
                            pass
                    i += 2
                    continue
                
                # Cumulative GPA
                if line.startswith("Cumulative GPA:"):
                    if i + 1 < len(first_page_lines):
                        gpa_str = first_page_lines[i + 1].strip()
                        try:
                            current_program['cumulativeGPA'] = float(gpa_str)
                        except ValueError:
                            pass
                    i += 2
                    continue
                
                # Writing Skills Requirement
                if line.startswith("Writing Skills Requirement:"):
                    writing_req = line.replace("Writing Skills Requirement:", "").strip()
                    current_program['writingSkillsRequirement'] = writing_req
                    i += 1
                    continue
                
                i += 1
            
            # Add last program if exists
            if current_program and current_program.get('degreeType'):
                # Set extended credit program flag if detected
                if extended_credit_program:
                    current_program['extendedCreditProgram'] = True
                program_history.append(current_program)
        
        # Now process all pages for terms, courses, and GPAs
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Get text and words with positions
            text = page.get_text()
            words = page.get_text("words")  # Returns list of (x0, y0, x1, y1, "text", block_no, line_no, word_no)
            
            if not text:
                continue
            
            lines = text.split('\n')
            
            # First pass: find all term headers and their GPAs
            for i, word in enumerate(words):
                word_text = word[4].strip()  # word[4] is the text
                
                # Check for term header (might be split across words)
                # Try current word + next word
                if i + 1 < len(words):
                    next_word = words[i + 1]
                    combined = f"{word_text} {next_word[4].strip()}"
                    term_info = extract_term_from_text(combined)
                    if term_info:
                        term_headers.append({
                            'page': page_num,
                            'lineIndex': int(word[1]),  # y0 position
                            'term': term_info['term'],
                            'year': term_info['year'],
                            'gpa': None,
                            'y': word[1]  # y0 position
                        })
                        i += 1
                        continue
                
                # Also try just current word
                term_info = extract_term_from_text(word_text)
                if term_info:
                    term_headers.append({
                        'page': page_num,
                        'lineIndex': int(word[1]),
                        'term': term_info['term'],
                        'year': term_info['year'],
                        'gpa': None,
                        'y': word[1]
                    })
                    continue
            
            # Extract transfer credits from "Transfer Credits" or "Exemptions" section
            in_transfer_section = False
            transfer_start_y = None
            transfer_end_y = None
            
            # Find transfer credits/exemptions section
            for word_idx, word in enumerate(words):
                word_text = word[4].strip()
                # Check for "Transfer Credits" or "Exemptions" header
                if 'Transfer' in word_text:
                    # Check if next word is "Credits"
                    if word_idx + 1 < len(words) and 'Credits' in words[word_idx + 1][4].strip():
                        in_transfer_section = True
                        transfer_start_y = word[1]
                        # Find where transfer section ends (look for first term header or course section)
                        for th in term_headers:
                            if th['page'] == page_num and th['y'] > transfer_start_y:
                                transfer_end_y = th['y']
                                break
                        break
                elif 'Exempt' in word_text or 'Exemption' in word_text:
                    # Also check for exemptions section
                    in_transfer_section = True
                    transfer_start_y = word[1]
                    # Find where exemptions section ends
                    for th in term_headers:
                        if th['page'] == page_num and th['y'] > transfer_start_y:
                            transfer_end_y = th['y']
                            break
                    break
            
            # Parse transfer credits if we're in that section
            if in_transfer_section:
                word_idx = 0
                while word_idx < len(words) - 5:
                    word = words[word_idx]
                    word_y = word[1]
                    
                    # Stop if we've passed the transfer section
                    if transfer_end_y and word_y > transfer_end_y:
                        break
                    
                    # Transfer credit format can be:
                    # Format 1: COURSE_CODE, COURSE_NUMBER, DESCRIPTION, EX/TRC, NA, credits
                    # Format 2: EX/TRC, NA, credits, COURSE_CODE, COURSE_NUMBER, DESCRIPTION
                    # Format 3: COURSE_CODE, COURSE_NUMBER, EX/TRC, NA, credits (no description)
                    
                    # Try Format 1 first: COURSE_CODE -> COURSE_NUMBER -> (description) -> EX/TRC -> NA -> credits
                    if (word_idx + 5 < len(words) and
                        is_course_code(words[word_idx][4].strip()) and
                        is_course_number(words[word_idx + 1][4].strip())):
                        
                        course_code = words[word_idx][4].strip()
                        course_number = words[word_idx + 1][4].strip()
                        
                        # Look for EX or TRC, NA/YEAR, credits pattern after course code/number
                        # Format: COURSE_CODE, COURSE_NUMBER, DESCRIPTION, EX/TRC, YEAR_ATTENDED, credits
                        # There might be description text between course number and grade
                        grade_idx = None
                        year_idx = None
                        credits_idx = None
                        grade_value = None
                        year_attended = None
                        
                        for j in range(word_idx + 2, min(word_idx + 15, len(words))):
                            w_text = words[j][4].strip().upper()
                            if (w_text == 'EX' or w_text == 'TRC') and grade_idx is None:
                                grade_idx = j
                                grade_value = w_text
                            elif grade_idx is not None and year_idx is None:
                                # YEAR ATTENDED can be NA or a year (4 digits)
                                if w_text == 'NA':
                                    year_idx = j
                                    year_attended = None
                                elif re.match(r'^\d{4}$', words[j][4].strip()):
                                    year_idx = j
                                    year_attended = words[j][4].strip()
                            elif re.match(r'^\d+\.\d{2}$', words[j][4].strip()) and year_idx is not None and credits_idx is None:
                                credits_idx = j
                                break
                        
                        # If we found the pattern, extract the transfer credit
                        if grade_idx and year_idx is not None and credits_idx:
                            # Extract description between course number and grade
                            course_title = ''
                            for j in range(word_idx + 2, grade_idx):
                                desc_text = words[j][4].strip()
                                if desc_text and not is_course_code(desc_text) and not is_course_number(desc_text):
                                    course_title += desc_text + ' '
                            
                            credits_str = words[credits_idx][4].strip()
                            
                            # For TRC: add to terms with "Transfer Credits" as term name
                            # For EX: add to transferCredits array (exemptions)
                            if grade_value == 'TRC':
                                # Use year_attended if available, otherwise use current year or None
                                transfer_year = year_attended if year_attended else '2020'
                                
                                # Create course object for term
                                course_obj = {
                                    'courseCode': f'{course_code} {course_number}',
                                    'section': '',
                                    'courseTitle': course_title.strip(),
                                    'credits': float(credits_str),
                                    'grade': 'TRC',
                                    'notation': None,
                                    'gpa': None,
                                    'classAvg': None,
                                    'classSize': None,
                                    'term': 'Transfer Credits',
                                    'year': transfer_year,
                                    'other': None
                                }
                                
                                # Add to terms (will be grouped later)
                                all_courses.append({
                                    'page': page_num,
                                    'lineIndex': int(word[1]),
                                    'rowIndex': word_idx,
                                    'tableIndex': -1,
                                    'course': course_obj,
                                    'assignedTerm': {'term': 'Transfer Credits', 'year': transfer_year}
                                })
                            else:
                                # EX grade - add to exempted courses
                                course_code_clean = f'{course_code}{course_number}'
                                exempted_courses_set.add(course_code_clean)
                            
                            word_idx = credits_idx + 1  # Skip past this transfer credit
                            continue
                    
                    # Try Format 2: EX/TRC -> NA/YEAR -> credits -> COURSE_CODE -> COURSE_NUMBER
                    elif (word_idx + 5 < len(words) and
                          words[word_idx][4].strip().upper() in ['EX', 'TRC'] and
                          (words[word_idx + 1][4].strip().upper() == 'NA' or 
                           re.match(r'^\d{4}$', words[word_idx + 1][4].strip())) and
                          re.match(r'^\d+\.\d{2}$', words[word_idx + 2][4].strip()) and
                          is_course_code(words[word_idx + 3][4].strip()) and
                          is_course_number(words[word_idx + 4][4].strip())):
                        
                        course_code = words[word_idx + 3][4].strip()
                        course_number = words[word_idx + 4][4].strip()
                        credits_str = words[word_idx + 2][4].strip()
                        grade_value = words[word_idx][4].strip().upper()
                        year_attended = None if words[word_idx + 1][4].strip().upper() == 'NA' else words[word_idx + 1][4].strip()
                        
                        # Look for description after course number
                        course_title = ''
                        for j in range(word_idx + 5, min(word_idx + 10, len(words))):
                            desc_text = words[j][4].strip()
                            if desc_text.upper() in ['EX', 'TRC'] or is_course_code(desc_text):
                                break
                            if desc_text and not is_course_number(desc_text):
                                course_title += desc_text + ' '
                        
                        # For TRC: add to terms with "Transfer Credits" as term name
                        # For EX: add to transferCredits array (exemptions)
                        if grade_value == 'TRC':
                            transfer_year = year_attended if year_attended else '2020'
                            
                            course_obj = {
                                'courseCode': f'{course_code} {course_number}',
                                'section': '',
                                'courseTitle': course_title.strip(),
                                'credits': float(credits_str),
                                'grade': 'TRC',
                                'notation': None,
                                'gpa': None,
                                'classAvg': None,
                                'classSize': None,
                                'term': 'Transfer Credits',
                                'year': transfer_year,
                                'other': None
                            }
                            
                            all_courses.append({
                                'page': page_num,
                                'lineIndex': int(word[1]),
                                'rowIndex': word_idx,
                                'tableIndex': -1,
                                'course': course_obj,
                                'assignedTerm': {'term': 'Transfer Credits', 'year': transfer_year}
                            })
                        else:
                            # EX grade - add to exempted courses
                            course_code_clean = f'{course_code}{course_number}'
                            exempted_courses_set.add(course_code_clean)
                        
                        word_idx += 5
                        continue
                    
                    word_idx += 1
            
            # Additional pass: catch any courses with EX or TRC grade that might have been missed
            # This is a universal check - any course with EX or TRC grade is a transfer credit
            transfer_word_idx = 0
            while transfer_word_idx < len(words) - 5:
                # Look for course pattern: COURSE_CODE, COURSE_NUMBER
                if (is_course_code(words[transfer_word_idx][4].strip()) and
                    is_course_number(words[transfer_word_idx + 1][4].strip())):
                    
                    # Look ahead for EX or TRC grade (might be after description, no section required)
                    grade_found = False
                    grade_idx = None
                    grade_value = None
                    credits_value = 0.0
                    
                    for j in range(transfer_word_idx + 2, min(transfer_word_idx + 15, len(words))):
                        w_text = words[j][4].strip().upper()
                        
                        # Check for EX or TRC grade
                        if w_text in ['EX', 'TRC']:
                            grade_found = True
                            grade_idx = j
                            grade_value = w_text
                            # Continue to find credits after grade
                        
                        # Check for credits (decimal numbers) - can be before or after grade
                        if re.match(r'^\d+\.\d{2}$', words[j][4].strip()):
                            val = float(words[j][4].strip())
                            # Use the credit value
                            credits_value = val
                    
                    # If grade found, handle based on grade type
                    if grade_found:
                        course_code = words[transfer_word_idx][4].strip()
                        course_number = words[transfer_word_idx + 1][4].strip()
                        course_key = f'{course_code} {course_number}'
                        
                        # Extract description (between course number and grade)
                        course_title = ''
                        seen_words = set()  # Track words to avoid duplicates
                        if grade_idx:
                            for k in range(transfer_word_idx + 2, grade_idx):
                                w_text = words[k][4].strip()
                                if (w_text and 
                                    w_text not in seen_words and
                                    not is_course_code(w_text) and 
                                    not is_course_number(w_text) and
                                    not re.match(r'^\d+\.\d{2}$', w_text) and
                                    w_text.upper() not in ['EX', 'TRC', 'NA', 'PASS', 'DISC'] and
                                    not re.match(r'^[A-F][+-]?$', w_text, re.IGNORECASE)):
                                    course_title += w_text + ' '
                                    seen_words.add(w_text)
                        
                        # For TRC: add to terms with "Transfer Credits" as term name
                        # For EX: add to transferCredits array (exemptions)
                        if grade_value == 'TRC':
                            # Check if already added to terms
                            already_in_terms = any(
                                c['course']['courseCode'] == course_key 
                                for c in all_courses 
                                if c.get('assignedTerm', {}).get('term') == 'Transfer Credits'
                            )
                            
                            if not already_in_terms:
                                transfer_year = '2020'  # Default year if not found
                                
                                course_obj = {
                                    'courseCode': course_key,
                                    'section': '',
                                    'courseTitle': course_title.strip(),
                                    'credits': credits_value,
                                    'grade': 'TRC',
                                    'notation': None,
                                    'gpa': None,
                                    'classAvg': None,
                                    'classSize': None,
                                    'term': 'Transfer Credits',
                                    'year': transfer_year,
                                    'other': None
                                }
                                
                                all_courses.append({
                                    'page': page_num,
                                    'lineIndex': int(words[transfer_word_idx][1]),
                                    'rowIndex': transfer_word_idx,
                                    'tableIndex': -1,
                                    'course': course_obj,
                                    'assignedTerm': {'term': 'Transfer Credits', 'year': transfer_year}
                                })
                        else:
                            # EX grade - add to exempted courses
                            course_code_clean = course_key.replace(' ', '')
                            exempted_courses_set.add(course_code_clean)
                        
                        # Move to next word to check for adjacent courses
                        # Don't skip too far to avoid missing courses that might be close together
                        transfer_word_idx += 1
                        continue
                
                transfer_word_idx += 1
            
            # Collect term GPAs (we'll match them to terms after processing all pages)
            for word_idx, word in enumerate(words):
                word_text = word[4].strip()
                word_y = word[1]
                
                # Check for "Term GPA" pattern
                if 'Term' in word_text:
                    # Check if next word is "GPA" or "G PA"
                    if word_idx + 1 < len(words):
                        next_word = words[word_idx + 1][4].strip()
                        if 'GPA' in next_word or 'G PA' in next_word:
                            # Found "Term GPA" - now find the GPA value
                            gpa_val = None
                            for j in range(word_idx + 2, min(word_idx + 5, len(words))):
                                gpa_word = words[j][4].strip()
                                # Try to extract GPA value
                                gpa_match = re.search(r'(\d+)\.?(\d*)', gpa_word)
                                if gpa_match:
                                    gpa_str = f"{gpa_match.group(1)}.{gpa_match.group(2) or '0'}"
                                    try:
                                        gpa_val = float(gpa_str)
                                        break
                                    except ValueError:
                                        pass
                            
                            if gpa_val is not None:
                                term_gpas.append({
                                    'page': page_num,
                                    'y': word_y,
                                    'gpa': gpa_val
                                })
            
            # Second pass: extract courses using word positions
            i = 0
            while i < len(words) - 2:
                word1 = words[i]
                word2 = words[i + 1] if i + 1 < len(words) else None
                word3 = words[i + 2] if i + 2 < len(words) else None
                
                if not word2 or not word3:
                    i += 1
                    continue
                
                text1 = word1[4].strip()  # word[4] is the text
                text2 = word2[4].strip()
                text3 = word3[4].strip()
                
                # Check for course pattern
                if (is_course_code(text1) and is_course_number(text2) and is_section(text3)):
                    excluded_codes = {'COURSE', 'GRADE', 'GPA', 'AVG', 'SIZE', 'OTHER', 
                                     'NOTATION', 'CLASS', 'PROGRAM', 'EARNED', 'EX', 'TRC', 'NA', 
                                     'TRANSFER', 'CREDITS', 'ATTEMPTED', 'DESCRIPTION', 'YEAR',
                                     'BEGINNING', 'END', 'RECORD', 'WEB', 'PAGE'}
                    if text1 in excluded_codes:
                        i += 1
                        continue
                    
                    # Look ahead for grade and credits
                    # Pattern is usually: course_code course_number section credits grade [gpa] [other]
                    grade = None
                    credits = None
                    gpa = None
                    
                    for j in range(i + 3, min(i + 20, len(words))):
                        w = words[j]
                        w_text = w[4].strip()
                        
                        # Check for credits first (decimal numbers like 3.00, 0.00)
                        if credits is None and re.match(r'^\d+\.\d{2}$', w_text):
                            credits = float(w_text)
                            continue
                        
                        # Check for grade (after credits)
                        if not grade:
                            # Prioritize letter grades
                            if re.match(r'^[A-F][+-]?$', w_text, re.IGNORECASE):
                                grade = w_text.upper()
                            # Then special grades (PASS, EX, TRC, DISC)
                            elif re.match(r'^PASS$|^EX$|^TRC$|^DISC$', w_text, re.IGNORECASE):
                                grade = w_text.upper()
                        
                        # Check for GPA (decimal number after grade, usually > 0)
                        if grade and gpa is None and re.match(r'^\d+\.\d{2}$', w_text):
                            val = float(w_text)
                            if val > 0:  # GPA is usually > 0
                                gpa = val
                    
                    # Allow courses with 0 credits if they have a grade (like CWTE courses with PASS)
                    if credits is None and not grade:
                        i += 1
                        continue
                    
                    course = {
                        'courseCode': f'{text1} {text2}',
                        'section': text3,
                        'credits': credits or 0,
                        'grade': grade or '',
                        'gpa': gpa
                    }
                    
                    # Skip if no credits and no grade (likely not a real course)
                    # Exception: CWTE courses are valid even with 0 credits and no visible grade
                    # (they may have notations like WKRT, RPT instead of grades)
                    is_cwte = text1.upper() == 'CWTE'
                    if course['credits'] == 0 and not course['grade'] and not is_cwte:
                        i += 1
                        continue
                    
                    # For CWTE courses with 0 credits and no grade, check for valid notations
                    if is_cwte and course['credits'] == 0 and not course['grade']:
                        # Look for notations like WKRT, RPT that indicate it's a valid course
                        has_notation = False
                        for j in range(i + 3, min(i + 15, len(words))):
                            w_text = words[j][4].strip().upper()
                            # Check if on same line
                            if abs(words[j][1] - word1[1]) < 5:
                                # Valid notations for CWTE courses
                                if w_text in ['WKRT', 'RPT', 'PASS', 'EX']:
                                    has_notation = True
                                    # Set notation as other field if available
                                    course['other'] = w_text
                                    break
                        # If no notation found, still allow it (CWTE courses are valid)
                        # But we'll keep it even without notation
                    
                    # If grade is EX, treat as exemption (add to exempted courses)
                    # If grade is TRC, treat as transfer credit (add to transfered courses)
                    if course['grade'] == 'EX':
                        course_code_clean = course['courseCode'].replace(' ', '')
                        exempted_courses_set.add(course_code_clean)
                        # Skip adding to regular courses if it's an EX grade
                        i += 3
                        continue
                    elif course['grade'] == 'TRC':
                        # TRC courses go to terms with "Transfer Credits" as term name
                        # Find year from nearby context or use default
                        transfer_year = '2020'  # Default year
                        
                        # Look for year in nearby words
                        for k in range(max(0, i - 5), min(i + 15, len(words))):
                            w_text = words[k][4].strip()
                            if re.match(r'^\d{4}$', w_text):
                                transfer_year = w_text
                                break
                        
                        course['term'] = 'Transfer Credits'
                        course['year'] = transfer_year
                        
                        # Add to all_courses with assigned term
                        all_courses.append({
                            'page': page_num,
                            'lineIndex': int(word1[1]),
                            'rowIndex': i,
                            'tableIndex': -1,
                            'course': course,
                            'assignedTerm': {'term': 'Transfer Credits', 'year': transfer_year}
                        })
                        i += 3
                        continue
                    
                    # Find which term this course belongs to based on Y position
                    course_y = word1[1]  # y0 position
                    
                    # Find the term header that comes immediately before this course
                    # and the next term header that comes after
                    best_term = None
                    best_y = None
                    next_term_y = None
                    
                    # Get all term headers on this page, sorted by Y
                    page_terms = [(th['y'], th) for th in term_headers if th['page'] == page_num and 'y' in th]
                    page_terms.sort(key=lambda x: x[0])
                    
                    # Find the term header immediately before this course
                    for term_y, th in reversed(page_terms):
                        if term_y < course_y:
                            best_term = th
                            best_y = term_y
                            break
                    
                    # Find the next term header after this course (if any)
                    for term_y, th in page_terms:
                        if term_y > course_y:
                            next_term_y = term_y
                            break
                    
                    # If no term found on this page, check previous pages
                    if not best_term:
                        for th in reversed(term_headers):
                            if th['page'] < page_num:
                                best_term = th
                                break
                    
                    # Only assign if we found a term and the course is between term headers
                    if best_term and (next_term_y is None or course_y < next_term_y):
                        all_courses.append({
                            'page': page_num,
                            'lineIndex': int(course_y),
                            'rowIndex': i,
                            'tableIndex': -1,
                            'course': course,
                            'assignedTerm': {'term': best_term['term'], 'year': best_term['year']}
                        })
                    
                    i += 3  # Skip past the course code, number, and section
                else:
                    i += 1
    
    finally:
        doc.close()
    
    # Match term GPAs to their terms
    # GPAs appear after their term's courses and before the next term header
    # Sort everything by position
    sorted_terms = sorted(term_headers, key=lambda th: (th['page'], th.get('y', 0)))
    sorted_gpas = sorted(term_gpas, key=lambda g: (g['page'], g['y']))
    
    # Create a combined sorted list to understand the sequence
    all_items = []
    for th in sorted_terms:
        all_items.append({'type': 'term', 'page': th['page'], 'y': th.get('y', 0), 'term': th})
    for gpa in sorted_gpas:
        all_items.append({'type': 'gpa', 'page': gpa['page'], 'y': gpa['y'], 'gpa': gpa})
    all_items.sort(key=lambda x: (x['page'], x['y']))
    
    # Match each GPA to the term that comes immediately before it
    for gpa_info in sorted_gpas:
        gpa_page = gpa_info['page']
        gpa_y = gpa_info['y']
        gpa_val = gpa_info['gpa']
        gpa_position = (gpa_page, gpa_y)
        
        # Find the term that comes immediately before this GPA in the sequence
        matching_term = None
        
        for item in all_items:
            if item['type'] == 'term':
                term_position = (item['page'], item['y'])
                if term_position < gpa_position:
                    matching_term = item['term']
                elif term_position > gpa_position:
                    # We've passed the GPA, stop looking
                    break
        
        # Assign GPA to the matching term if it doesn't already have one
        if matching_term and not matching_term.get('gpa'):
            matching_term['gpa'] = gpa_val
    
    # Match courses to terms
    matched_courses = []
    seen_courses = set()  # Track (courseCode, section) to prevent duplicates
    
    for course_info in all_courses:
        course = course_info['course']
        course_key = (course['courseCode'], course['section'])
        
        # Skip duplicates
        if course_key in seen_courses:
            continue
        
        # Track EX and TRC grades separately for exemptedCourses and transferedCourses
        course_grade = course.get('grade', '').upper()
        if course_grade == 'EX':
            # EX grades go to exemptedCourses
            course_code_clean = course['courseCode'].replace(' ', '')
            if course_code_clean:
                exempted_courses_set.add(course_code_clean)
            continue
        elif course_grade == 'TRC':
            # TRC grades go to transferedCourses
            course_code_clean = course['courseCode'].replace(' ', '')
            if course_code_clean:
                transfered_courses_set.add(course_code_clean)
            # TRC courses can also appear in semesters if they have a term assignment
            # Continue processing to see if they're assigned to a term
        
        seen_courses.add(course_key)
        
        # Use assigned term if available (from text extraction), otherwise use position-based matching
        assigned_term = course_info.get('assignedTerm')
        
        if assigned_term:
            # Verify the assigned term exists in term_headers
            term_exists = any(
                th['term'] == assigned_term['term'] and th['year'] == assigned_term['year']
                for th in term_headers
            )
            if term_exists:
                matched_courses.append({
                    'course': course,
                    'term': assigned_term['term'],
                    'year': assigned_term['year']
                })
                continue
        
        # Fallback: find the term header that comes immediately before this course
        course_position = (course_info['page'], course_info['lineIndex'])
        
        best_term = None
        best_position = None
        
        for th in term_headers:
            term_position = (th['page'], th['lineIndex'])
            
            # Term must come before course
            if term_position < course_position:
                if best_position is None or term_position > best_position:
                    best_position = term_position
                    best_term = th
        
        # If no term found, skip this course (it's likely a header or invalid)
        if not best_term:
            continue
        
        matched_courses.append({
            'course': course,
            'term': best_term['term'],
            'year': best_term['year']
        })
    
    # Initialize collections for the new structure (sets already initialized at top)
    semesters_dict = defaultdict(lambda: {'term': '', 'courses': []})
    
    # Group courses by term (excluding Transfer Credits terms)
    for course_info in matched_courses:
        course = course_info['course']
        course_grade = course.get('grade', '').upper()
        
        # Skip EX and TRC grades for semesters (they're handled separately)
        if course_grade in ['EX', 'TRC']:
            continue
        
        term_name = f"{course_info['term']} {course_info['year']}"
        
        # Skip "Transfer Credits" terms
        if course_info['term'] == 'Transfer Credits':
            continue
        
        # Add course to semester
        course_code = course.get('courseCode', '').replace(' ', '')
        if course_code:
            course_obj = {'code': course_code}
            if course_grade:
                course_obj['grade'] = course_grade
            semesters_dict[term_name]['term'] = term_name
            semesters_dict[term_name]['courses'].append(course_obj)
    
    # Build programInfo from programHistory
    if program_history and len(program_history) > 0:
        latest_program = program_history[-1]
        program_info = {}
        
        # Build degree string
        degree_type = latest_program.get('degreeType', '')
        major = latest_program.get('major', '')
        if degree_type and major:
            program_info['degree'] = f"{degree_type}, {major}".strip(', ')
        elif degree_type:
            program_info['degree'] = degree_type
        elif major:
            program_info['degree'] = major
        
        # Extract first term from admitTerm or first semester
        if latest_program.get('admitTerm'):
            program_info['firstTerm'] = latest_program['admitTerm']
        elif semesters_dict:
            first_semester_term = sorted(semesters_dict.keys())[0] if semesters_dict else None
            if first_semester_term:
                program_info['firstTerm'] = first_semester_term
        
        # Extract last term from last semester
        if semesters_dict:
            last_semester_term = sorted(semesters_dict.keys())[-1] if semesters_dict else None
            if last_semester_term:
                program_info['lastTerm'] = last_semester_term
        
        # Extract coop status
        if latest_program.get('coop'):
            program_info['isCoop'] = True
        
        # Extract extended credit program status (check both program history and full page text)
        if latest_program.get('extendedCreditProgram') or extended_credit_program:
            program_info['isExtendedCreditProgram'] = True
        
        # Extract minimum program length
        min_credits = latest_program.get('minCreditsRequired')
        if min_credits is not None:
            try:
                program_info['minimumProgramLength'] = int(min_credits)
            except (ValueError, TypeError):
                pass
        
        if program_info:
            result['programInfo'] = program_info
    elif extended_credit_program:
        # If no program history but extended credit program was detected, still add it
        result['programInfo'] = {'isExtendedCreditProgram': True}
    
    # Build semesters list (sorted chronologically)
    if semesters_dict:
        def semester_sort_key(term_name):
            """Sort semesters chronologically"""
            # Extract year and term from term name like "Fall 2022" or "Fall/Winter 2025-26"
            parts = term_name.split()
            if len(parts) >= 2:
                term_part = parts[0]
                year_part = parts[1]
                try:
                    year_int = int(year_part.split('-')[0])
                except (ValueError, AttributeError):
                    year_int = 2020
                term_order = {'Winter': 1, 'Spring': 2, 'Summer': 3, 'Fall': 4, 'Fall/Winter': 4.5}.get(term_part, 5)
                return (year_int, term_order)
            return (2020, 5)
        
        sorted_semester_terms = sorted(semesters_dict.keys(), key=semester_sort_key)
        semesters_list = [semesters_dict[term] for term in sorted_semester_terms]
        result['semesters'] = semesters_list
    
    # Final pass: collect any EX or TRC courses from all_courses that might have been missed
    for course_info in all_courses:
        course = course_info.get('course', {})
        course_grade = course.get('grade', '').upper()
        course_code = course.get('courseCode', '').replace(' ', '')
        
        if course_code:
            if course_grade == 'EX':
                exempted_courses_set.add(course_code)
            elif course_grade == 'TRC':
                transfered_courses_set.add(course_code)
    
    # Add exempted and transfered courses to result (always include, even if empty)
    result['exemptedCourses'] = sorted(list(exempted_courses_set)) if exempted_courses_set else []
    result['transferedCourses'] = sorted(list(transfered_courses_set)) if transfered_courses_set else []
    
    return result


def main():
    if len(sys.argv) < 2:
        print("Usage: transcriptParser.py <pdf_path>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    if not Path(pdf_path).exists():
        print(f"ERROR: File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)
    
    try:
        result = parse_transcript(pdf_path)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
