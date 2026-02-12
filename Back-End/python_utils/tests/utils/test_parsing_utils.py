import unittest
from unittest.mock import patch, MagicMock
import sys
import os
import re

# Add the parent directory to the path to import the modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from utils.parsing_utils import (
    clean_text,
    extract_name_and_credits,
    parse_course_title_and_credits,
    split_sections,
    expand_course_shorthand,
    extract_prereq_coreq_from_sentence,
    parse_prereq_coreq,
    make_prereq_coreq_into_array,
    get_not_taken,
    parse_course_rules,
    parse_course_components,
    get_course_sort_key,
    COURSE_REGEX,
    TITLE_REGEX,
    CATALOG_COURSE_TITLE_REGEX
)
from models import CourseRules



def test_clean_text():
    test_strings = (
        "  B Eng degree and B Comp Sc program: COMP248Programming, 3credits"
        "Course–Title'sDescription; Prerequisites:MATH101,COMP248;Important. 3 . 5 credits GPA of 3 . 7   "
    )
    expected_strings = (
        "BEng degree and BCompSc program: COMP 248 Programming, 3 credits"
        "Course–Title'sDescription; Prerequisites: MATH 101, COMP 248; Important. 3.5 credits GPA of 3.7"
    )
    result = clean_text(test_strings)
    assert result == expected_strings

def test_extract_name_and_credits_valid():
    mock_element = MagicMock()
    mock_element.stripped_strings = ["Computer Science Program (120 credits)"]
    name, credits_required = extract_name_and_credits(mock_element)
    assert name == "Computer Science Program"
    assert credits_required == 120

def test_extract_name_and_credits_decimal_credits():
    mock_element = MagicMock()
    mock_element.stripped_strings = ["Math Course Pool (12.5 credits)"]
    name, credits_required = extract_name_and_credits(mock_element)
    assert name == "Math Course Pool"
    assert credits_required == 12.5

def test_parse_course_title_and_credits_valid():
    mock_element = MagicMock()
    mock_element.stripped_strings = ["COMP 248 Introduction to Programming (3 credits)"]
    course_id, title, credits_required = parse_course_title_and_credits(mock_element)
    assert course_id == "COMP 248"
    assert title == "Introduction to Programming"
    assert credits_required == 3.0

def test_split_sections_all_sections():
    text = ("Prerequisite/Corequisite: MATH 201 "
            "Description: This is a programming course. "
            "Component(s): Lecture 3 hours, Tutorial 1 hour "
            "Notes: Important for CS students.")
    result = split_sections(text)
    expected = {
        "Prerequisite/Corequisite:": "MATH 201",
        "Description:": "This is a programming course.",
        "Component(s):": "Lecture 3 hours, Tutorial 1 hour",
        "Notes:": "Important for CS students."
    }
    assert result == expected

def test_split_sections_partial_sections():
    text = "Description: Course about algorithms. Notes: Challenging course."
    result = split_sections(text)
    expected = {
        "Prerequisite/Corequisite:": "",
        "Description:": "Course about algorithms.",
        "Component(s):": "",
        "Notes:": "Challenging course."
    }
    assert result == expected

def test_split_sections_empty_text():
    result = split_sections("")
    expected = {
        "Prerequisite/Corequisite:": "",
        "Description:": "",
        "Component(s):": "",
        "Notes:": ""
    }
    assert result == expected

def test_expand_course_shorthand():
    mock_match = MagicMock()
    mock_match.group.side_effect = lambda x: {1: "COMP 248", 2: "249"}[x]
    result = expand_course_shorthand(mock_match)
    assert result == "COMP 248 or COMP 249"

def test_extract_prereq_coreq_from_sentence_previously():
    sentences = ["Must be completed previously: MATH 204"]
    prereq, coreq = extract_prereq_coreq_from_sentence(sentences)
    assert len(prereq) == 1
    assert prereq[0] == "MATH 204"
    assert len(coreq) == 0

def test_extract_prereq_coreq_from_sentence_concurrently():
    sentences = ["Must be completed concurrently: PHYS 204"]
    prereq, coreq = extract_prereq_coreq_from_sentence(sentences)
    assert len(prereq) == 0
    assert len(coreq) == 1
    assert coreq[0] == "PHYS 204"

def test_extract_prereq_coreq_from_sentence_both():
    sentences = ["Must be completed previously or concurrently: MATH 204"]
    prereq, coreq = extract_prereq_coreq_from_sentence(sentences)
    assert len(prereq) == 1
    assert len(coreq) == 1
    assert prereq[0] == "MATH 204"
    assert coreq[0] == "MATH 204"

def test_parse_prereq_coreq_empty():
    prereq, coreq = parse_prereq_coreq("")
    assert prereq == ""
    assert coreq == ""

def test_parse_prereq_coreq_no_patterns():
    text = "MATH 204 and COMP 248"
    prereq, coreq = parse_prereq_coreq(text)
    assert prereq == text
    assert coreq == ""

def test_make_prereq_coreq_into_array_empty():
    result = make_prereq_coreq_into_array("")
    assert result == []
    result = make_prereq_coreq_into_array(None)
    assert result == []

def test_make_prereq_coreq_into_array_single_course():
    result = make_prereq_coreq_into_array("COMP 248")
    expected = [["COMP 248"]]
    assert result == expected

def test_make_prereq_coreq_into_array_or_alternatives():
    result = make_prereq_coreq_into_array("COMP 248 or COMP 249")
    expected = [["COMP 248", "COMP 249"]]
    assert result == expected

def test_make_prereq_coreq_into_array_comma_separated():
    result = make_prereq_coreq_into_array("COMP 248, MATH 204")
    expected = [["COMP 248"], ["MATH 204"]]
    assert result == expected

def test_make_prereq_coreq_into_array_semicolon_groups():
    result = make_prereq_coreq_into_array("COMP 248; MATH 204 or MATH 205")
    expected = [["COMP 248"], ["MATH 204", "MATH 205"]]
    assert result == expected

def test_get_not_taken_multiple_courses():
    text = "Students who have taken COMP 218 or SOEN 287 may not take this course for credit"
    result = get_not_taken(text)
    assert result == ["COMP 218", "SOEN 287"]

def test_parse_course_rules():
    prereq_text = "COMP 248"
    notes_text = "Students who have taken COMP 218 may not take this course for credit"
    result = parse_course_rules(prereq_text, notes_text)
    assert isinstance(result, CourseRules)
    assert result.prereq == [["COMP 248"]]
    assert result.coreq == []
    assert result.not_taken == ["COMP 218"]

def test_parse_course_components_multiple():
    text = "Lecture 3 hours per week; Tutorial 1 hour per week; Laboratory 2 hours per week"
    result = parse_course_components(text)
    expected = [
        "Lecture 3 hours per week",
        "Tutorial 1 hour per week", 
        "Laboratory 2 hours per week"
    ]
    assert result == expected

def test_get_course_sort_key_sorting_comparison():
    courses = ["MATH 205", "COMP 248", "COMP 201", "ENGR 101"]
    sorted_courses = sorted(courses, key=get_course_sort_key)
    expected = ["COMP 201", "COMP 248", "ENGR 101", "MATH 205"]
    assert sorted_courses == expected

def test_course_regex_matches():
    valid_courses = ["COMP 248", "ENGR 101", "MATH 204", "SOEN 287"]
    for course in valid_courses:
        assert re.match(COURSE_REGEX, course) is not None

def test_course_regex_no_match():
    invalid_courses = ["comp 248", "COMP248", "CO 248", "COMP 48", "248 COMP"]
    for course in invalid_courses:
        assert re.match(COURSE_REGEX, course) is None

def test_title_regex_matches():
    titles = [
        "Computer Science Program (120 credits)",
        "Math Course (3 credits)",
        "Advanced Engineering (4.5 credits)"
    ]
    for title in titles:
        match = re.match(TITLE_REGEX, title)
        assert match is not None

def test_catalog_course_title_regex_matches():
    title = "COMP 248 Introduction to Programming (3 credits)"
    match = re.match(CATALOG_COURSE_TITLE_REGEX, title)
    assert match is not None
    assert match.group(1) == "COMP 248"
    assert match.group(2) == "Introduction to Programming"
    assert match.group(3) == "3"