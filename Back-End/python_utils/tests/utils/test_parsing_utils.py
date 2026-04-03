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
    parse_minimum_credits,
    parse_coursepool_rules,
    COURSE_REGEX,
    TITLE_REGEX,
    CATALOG_COURSE_TITLE_REGEX
)
from models import Rule, RuleType



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
    prereq, coreq, prereq_or_coreq = extract_prereq_coreq_from_sentence(sentences)
    assert len(prereq) == 1
    assert prereq[0] == "MATH 204"
    assert len(coreq) == 0
    assert len(prereq_or_coreq) == 0

def test_extract_prereq_coreq_from_sentence_concurrently():
    sentences = ["Must be completed concurrently: PHYS 204"]
    prereq, coreq, prereq_or_coreq = extract_prereq_coreq_from_sentence(sentences)
    assert len(prereq) == 0
    assert len(coreq) == 1
    assert coreq[0] == "PHYS 204"
    assert len(prereq_or_coreq) == 0

def test_extract_prereq_coreq_from_sentence_previously_or_concurrently():
    sentences = ["Must be completed previously or concurrently: MATH 204"]
    prereq, coreq, prereq_or_coreq = extract_prereq_coreq_from_sentence(sentences)
    assert len(prereq) == 0
    assert len(coreq) == 0
    assert len(prereq_or_coreq) == 1
    assert prereq_or_coreq[0] == "MATH 204"

def test_parse_prereq_coreq_empty():
    prereq, coreq, prereq_or_coreq = parse_prereq_coreq("")
    assert prereq == ""
    assert coreq == ""
    assert prereq_or_coreq == ""

def test_parse_prereq_coreq_no_patterns():
    text = "MATH 204 and COMP 248"
    prereq, coreq, prereq_or_coreq = parse_prereq_coreq(text)
    assert prereq == text
    assert coreq == ""
    assert prereq_or_coreq == ""

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

def test_make_prereq_coreq_into_array_multiple_shorthand_expansion():
    result = make_prereq_coreq_into_array("COEN 366 or 445 or ELEC 366 or 463")
    expected = [["COEN 366", "COEN 445", "ELEC 366", "ELEC 463"]]
    assert result == expected
    
    result = make_prereq_coreq_into_array("MATH 205 or 206 or 209")
    expected = [["MATH 205", "MATH 206", "MATH 209"]]
    assert result == expected

def test_get_not_taken_multiple_courses():
    text = "Students who have taken COMP 218 or SOEN 287 may not take this course for credit"
    result = get_not_taken(text)
    assert result == ["COMP 218", "SOEN 287"]

def test_parse_course_rules():
    prereq_text = "COMP 248"
    notes_text = "Students who have taken COMP 218 may not take this course for credit"
    result = parse_course_rules(prereq_text, notes_text)

    assert isinstance(result, list)
    assert all(isinstance(rule, Rule) for rule in result)

    prereq_rules = [c for c in result if c.type == RuleType.PREREQUISITE]
    not_taken_rules = [c for c in result if c.type == RuleType.NOT_TAKEN]

    assert len(prereq_rules) == 1
    assert prereq_rules[0].params.courseList == ["COMP 248"]
    assert prereq_rules[0].params.minCourses == 1

    assert len(not_taken_rules) == 1
    assert not_taken_rules[0].params.courseList == ["COMP 218"]

def test_parse_course_rules_previously_or_concurrently_only_creates_pre_coreq_rule():
    prereq_text = "The following courses must be completed previously or concurrently: MATH 204 or Cegep Mathematics 105 or NYC."
    result = parse_course_rules(prereq_text, "")

    prereq_rules = [r for r in result if r.type == RuleType.PREREQUISITE]
    pre_coreq_rules = [r for r in result if r.type == RuleType.PREREQUISITE_OR_COREQUISITE]

    assert len(prereq_rules) == 0
    assert len(pre_coreq_rules) == 1
    assert pre_coreq_rules[0].params.courseList == ["MATH 204"]

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


def test_get_course_sort_key_prefers_three_digit_before_four_digit():
    courses = ["HIST 307", "HIST 3081", "HIST 308", "HIST 309", "HIST 313"]
    sorted_courses = sorted(courses, key=get_course_sort_key)
    expected = ["HIST 307", "HIST 308", "HIST 3081", "HIST 309", "HIST 313"]
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

def test_parse_minimum_credits():
    # Test cases with "prior to enrolling"
    text = "Students must have completed a minimum of 12 credits prior to enrolling in this course."
    result = parse_minimum_credits(text)
    assert (result - 12.0) < 1e-8

    # Test "Students must have completed" (past tense) - AERO 490, SOEN 490
    text = "Students must have completed 75 credits in the program prior to enrolling."
    result = parse_minimum_credits(text)
    assert (result - 75.0) < 1e-8

    # Test "Students must complete" (present tense) - CIVI 440, COMP 490
    text = "Students must complete 60 credits prior to enrolling."
    result = parse_minimum_credits(text)
    assert (result - 60.0) < 1e-8

    # Test "Students must complete a minimum of" - BLDG 490, COEN 390
    text = "Students must complete a minimum of 45 credits in the BEng (Computer) prior to enrolling."
    result = parse_minimum_credits(text)
    assert (result - 45.0) < 1e-8

    # Test "Students must complete a minimum" (missing "of") - ENGR 412
    text = "Students must complete a minimum 75 credits in the BEng program with a cumulative GPA of 3.00 or better prior to enrolling."
    result = parse_minimum_credits(text)
    assert (result - 75.0) < 1e-8

    # Test cases without "prior to enrolling" - CIVI 490, ENCS 483
    text = "Students must complete a minimum of 54 credits in the BCompSc in Health and Life Sciences program."
    result = parse_minimum_credits(text)
    assert (result - 54.0) < 1e-8

    # Test complex case with additional text - ENCS 485
    text = "Students must complete a minimum of 24 credits towards an undergraduate program offered by the Gina Cody School of Engineering and Computer Science, with a minimum GPA of 2.50."
    result = parse_minimum_credits(text)
    assert (result - 24.0) < 1e-8

    # Test case with multiple credit requirements - should pick the first one
    text = "Students must complete a minimum of 60 credits in an engineering program or minimum of 45 credits in a non-engineering program prior to enrolling."
    result = parse_minimum_credits(text)
    assert (result - 60.0) < 1e-8

    # Test no credit requirement
    text = "No minimum credit requirement."
    result = parse_minimum_credits(text)
    assert (result - 0.0) < 1e-8


# ---------------------------------------------------------------------------
# parse_coursepool_rules – patterns 5, 6, 7
# ---------------------------------------------------------------------------

def test_parse_coursepool_rules_course_removal_single_degree():
    text = (
        "The Engineering Core credits for students in the BEng in Building Engineering "
        "are reduced from 30.5 credits to 29 credits since Building Engineering students "
        "are not required to take ENGR 202 in their program."
    )
    rules = parse_coursepool_rules(text)
    removal = [c for c in rules if c.type == RuleType.COURSE_REMOVAL]
    assert len(removal) == 1
    assert removal[0].params.courseId == "ENGR 202"
    assert removal[0].params.degreeId == "BEng in Building Engineering"


def test_parse_coursepool_rules_course_removal_multiple_degrees():
    text = (
        "The Engineering Core credits for students in the BEng in Chemical Engineering, "
        "BEng in Mechanical Engineering, BEng in Industrial Engineering and "
        "BEng in Aerospace Engineering programs are reduced from 30.5 credits to 27 credits "
        "since Chemical, Mechanical, Industrial and Aerospace Engineering students are not "
        "required to take ELEC 275 in their program."
    )
    rules = parse_coursepool_rules(text)
    removals = [c for c in rules if c.type == RuleType.COURSE_REMOVAL]
    removed_degrees = {c.params.degreeId for c in removals}
    assert all(c.params.courseId == "ELEC 275" for c in removals)
    assert "BEng in Chemical Engineering" in removed_degrees
    assert "BEng in Mechanical Engineering" in removed_degrees
    assert "BEng in Industrial Engineering" in removed_degrees
    assert "BEng in Aerospace Engineering" in removed_degrees


def test_parse_coursepool_rules_course_removal_two_degrees():
    text = (
        "The Engineering Core credits for students in the BEng in Computer Engineering "
        "and the BEng in Software Engineering are reduced from 30.5 credits to 27.5 credits "
        "since Computer Engineering and Software Engineering students are not required to "
        "take ENGR 391 in their program."
    )
    rules = parse_coursepool_rules(text)
    removals = [c for c in rules if c.type == RuleType.COURSE_REMOVAL]
    removed_degrees = {c.params.degreeId for c in removals}
    assert all(c.params.courseId == "ENGR 391" for c in removals)
    assert "BEng in Computer Engineering" in removed_degrees
    assert "BEng in Software Engineering" in removed_degrees


def test_parse_coursepool_rules_course_substitution_multiple_degrees():
    text = (
        "Students in the BEng in Electrical Engineering and the BEng in Computer Engineering "
        "shall replace ELEC 275 with ELEC 273."
    )
    rules = parse_coursepool_rules(text)
    subs = [c for c in rules if c.type == RuleType.COURSE_SUBSTITUTION]
    sub_degrees = {c.params.degreeId for c in subs}
    assert all(c.params.oldCourseId == "ELEC 275" for c in subs)
    assert all(c.params.newCourseId == "ELEC 273" for c in subs)
    assert "BEng in Electrical Engineering" in sub_degrees
    assert "BEng in Computer Engineering" in sub_degrees


def test_parse_coursepool_rules_course_substitution_single_degree():
    text = "Students in BEng in Building Engineering shall replace ENGR 392 with BLDG 482."
    rules = parse_coursepool_rules(text)
    subs = [c for c in rules if c.type == RuleType.COURSE_SUBSTITUTION]
    assert len(subs) == 1
    assert subs[0].params.oldCourseId == "ENGR 392"
    assert subs[0].params.newCourseId == "BLDG 482"
    assert subs[0].params.degreeId == "BEng in Building Engineering"


def test_parse_coursepool_rules_course_substitution_may_replace():
    text = "Students in the BEng in Software Engineering may replace ENGR 391 with COMP 361."
    rules = parse_coursepool_rules(text)
    additions = [c for c in rules if c.type == RuleType.COURSE_ADDITION]
    max_sets = [c for c in rules if c.type == RuleType.MAX_COURSES_FROM_SET]
    assert len(additions) == 1
    assert additions[0].params.courseId == "COMP 361"
    assert additions[0].params.degreeId == "BEng in Software Engineering"
    assert len(max_sets) == 1
    assert set(max_sets[0].params.courseList) == {"ENGR 391", "COMP 361"}
    assert max_sets[0].params.maxCourses == 1


def test_parse_coursepool_rules_course_pool_override_elective():
    text = (
        "Students must select three credits of General Education Humanities and Social Sciences "
        "Electives from one of the lists in Section 71.110. "
        "Students in the BEng in Industrial Engineering shall take ACCO 220 as their "
        "General Education elective."
    )
    rules = parse_coursepool_rules(text)
    overrides = [c for c in rules if c.type == RuleType.OVERRIDE_COURSEPOOL_COURSES]
    assert len(overrides) == 1
    assert overrides[0].params.coursePoolId == "General Education Humanities and Social Sciences Electives"
    assert overrides[0].params.newCourseList == ["ACCO 220"]
    assert overrides[0].params.degreeId == "BEng in Industrial Engineering"


def test_parse_coursepool_rules_combined_engineering_core_block():
    """Full block reproducing the five Engineering Core notes (post-clean_text)."""
    text = (
        "(1) The Engineering Core credits for students in the BEng in Building Engineering "
        "are reduced from 30.5 credits to 29 credits since Building Engineering students "
        "are not required to take ENGR 202 in their program. "
        "(2) The Engineering Core credits for students in the BEng in Chemical Engineering, "
        "BEng in Mechanical Engineering, BEng in Industrial Engineering and BEng in Aerospace Engineering "
        "programs are reduced from 30.5 credits to 27 credits since Chemical, Mechanical, Industrial "
        "and Aerospace Engineering students are not required to take ELEC 275 in their program. "
        "Students in the BEng in Electrical Engineering and the BEng in Computer Engineering "
        "shall replace ELEC 275 with ELEC 273. "
        "(3) The Engineering Core credits for students in the BEng in Computer Engineering "
        "and the BEng in Software Engineering are reduced from 30.5 credits to 27.5 credits "
        "since Computer Engineering and Software Engineering students are not required to "
        "take ENGR 391 in their program. "
        "(4) Students in BEng in Building Engineering shall replace ENGR 392 with BLDG 482. "
        "(5) Students must select three credits of General Education Humanities and Social Sciences "
        "Electives. Students in the BEng in Industrial Engineering shall take ACCO 220 as their "
        "General Education elective."
    )
    rules = parse_coursepool_rules(text)

    removals = {(c.params.degreeId, c.params.courseId)
                for c in rules if c.type == RuleType.COURSE_REMOVAL}
    subs = {(c.params.degreeId, c.params.oldCourseId, c.params.newCourseId)
            for c in rules if c.type == RuleType.COURSE_SUBSTITUTION}
    overrides = {(c.params.degreeId, c.params.coursePoolId, tuple(c.params.newCourseList))
                 for c in rules if c.type == RuleType.OVERRIDE_COURSEPOOL_COURSES}

    # Removals
    assert ("BEng in Building Engineering", "ENGR 202") in removals
    assert ("BEng in Chemical Engineering", "ELEC 275") in removals
    assert ("BEng in Mechanical Engineering", "ELEC 275") in removals
    assert ("BEng in Industrial Engineering", "ELEC 275") in removals
    assert ("BEng in Aerospace Engineering", "ELEC 275") in removals
    assert ("BEng in Computer Engineering", "ENGR 391") in removals
    assert ("BEng in Software Engineering", "ENGR 391") in removals

    # Substitutions
    assert ("BEng in Electrical Engineering", "ELEC 275", "ELEC 273") in subs
    assert ("BEng in Computer Engineering", "ELEC 275", "ELEC 273") in subs
    assert ("BEng in Building Engineering", "ENGR 392", "BLDG 482") in subs

    # Overrides
    assert ("BEng in Industrial Engineering", "General Education Humanities and Social Sciences Electives", ("ACCO 220",)) in overrides