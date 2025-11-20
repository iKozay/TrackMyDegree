import pytest
import re
from unittest.mock import patch, Mock
import sys, os
from requests.exceptions import RequestException
from bs4 import BeautifulSoup

# Fixes path issues
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Scrapers')))

from course_data_scraper import (
    extract_course_data, clean_text, fetch_html,
    parse_title_and_credits, split_sections, parse_prereq_coreq,
    make_prereq_coreq_into_array, get_not_taken
)

# NOTE: The global 'courses' list must be managed manually in tests
global courses
courses = []

# ---------- Sample HTML Templates (Same) ----------
HTML_VALID = """
<html>
<body>
<div class="course">
  <h3 class="accordion-header xlarge">
    SOEN 357 User Interface Design (3 credits)
  </h3>
  <div class="accordion-body">
    Prerequisite/Corequisite: previously: SOEN 287. Description: Introduction to user interface design.
    Component(s): Lecture Notes: Offered in Fall. Notes: Special topic.
  </div>
</div>
</body>
</html>
"""

HTML_FLOAT_CREDITS = """
<html>
<body>
<div class="course">
  <h3 class="accordion-header xlarge">COMP 400 Advanced Topics (3.5 credits)</h3>
  <div class="accordion-body">Description: Advanced concepts.</div>
</div>
</body>
</html>
"""

HTML_MULTIPLE_COURSES = """
<html>
<body>
<div class="course">
  <h3 class="accordion-header xlarge">SOEN 228 System Hardware (3 credits)</h3>
  <div class="accordion-body">Description: Hardware overview.</div>
</div>
<div class="course">
  <h3 class="accordion-header xlarge">SOEN 357 User Interface Design (3 credits)</h3>
  <div class="accordion-body">
    Prerequisite/Corequisite: previously: SOEN 287. Description: UI design principles.
  </div>
</div>
</body>
</html>
"""

HTML_MISSING_SECTIONS = """
<html>
<body>
<div class="course">
  <h3 class="accordion-header xlarge">SOEN 385 Data Communications (4 credits)</h3>
  <div class="accordion-body">Some random text with no structure</div>
</div>
</body>
</html>
"""

HTML_NO_HEADER = """
<html>
<body>
<div class="course">
  <div class="accordion-body">Description: Missing header</div>
</div>
</body>
</html>
"""

def make_mock_soup(html):
    return BeautifulSoup(html, 'lxml')

def make_mock_response(html, status_code=200):
    mock_resp = Mock(status_code=status_code, content=html.encode("utf-8"))
    mock_resp.headers = {'content-type': 'text/html; charset=utf-8'}
    mock_resp.encoding = 'utf-8'
    return mock_resp

@patch("course_data_scraper.requests.get")
def test_fetch_html_success(mock_get):
    mock_get.return_value = make_mock_response("<html>Test</html>")
    soup = fetch_html("https://dummy.com")
    assert soup.find('html') is not None

@patch("course_data_scraper.requests.get")
def test_fetch_html_failure_status(mock_get):
    mock_get.return_value = make_mock_response("Error", status_code=404)
    soup = fetch_html("https://dummy.com")
    assert soup is None


def test_parse_title_and_credits_full_match():
    course_id, title, credits = parse_title_and_credits("SOEN 357 UI Design (3 credits)", clean_text)
    assert course_id == "SOEN 357"
    assert credits == 3


def test_split_sections_full():
    text = "Prerequisite/Corequisite: P. Description: D. Component(s): C. Notes: N."
    sections = split_sections(text, clean_text)
    assert sections["Prerequisite/Corequisite:"] == "P."

def test_split_sections_missing_middle():
    text = "Prerequisite/Corequisite: P. Notes: N."
    sections = split_sections(text, clean_text)
    assert sections["Prerequisite/Corequisite:"] == "P. Notes: N."
    assert sections["Description:"] == ""


@pytest.mark.parametrize("input_text, expected_pre_contains, expected_co_contains", [
    ("previously or concurrently: SOEN 287.", "SOEN 287", "SOEN 287"),
    ("previously: SOEN 287 and COMP 248.", "SOEN 287", ""),
    ("concurrently: ENGR 301.", "", "ENGR 301"),
    ("18 credits in Engineering.", "18 credits in Engineering", ""),
])
def test_parse_prereq_coreq_coverage_branches(input_text, expected_pre_contains, expected_co_contains):
    prereq, coreq = parse_prereq_coreq(input_text, clean_text)
    assert expected_pre_contains.strip() in prereq
    assert expected_co_contains.strip() in coreq


@patch("course_data_scraper.fetch_html")
def test_extract_valid_course(mock_fetch):
    mock_fetch.return_value = make_mock_soup(HTML_VALID)
    result = extract_course_data("SOEN 357", "https://dummy-url.com")
    # FIXED: Check for the actual prerequisite, not the course ID.
    assert "previously: SOEN 287." == result["prerequisites/corequisites"]
    assert result["credits"] == 3

def test_rules():
    assert make_prereq_coreq_into_array("") == []
    assert make_prereq_coreq_into_array("COEN 243 / MECH 215") == [["COEN 243", "MECH 215"]]
    assert get_not_taken("") == []
    assert get_not_taken("Students who have received credit for COMP 249 may not take this course for credit.") == ["COMP 249"]

@patch("course_data_scraper.fetch_html")
def test_extract_all_courses_any_code(mock_fetch):
    mock_fetch.return_value = make_mock_soup(HTML_MULTIPLE_COURSES)
    global courses
    courses = [] 
    result = extract_course_data("ANY", "https://dummy-url.com")
    assert isinstance(result, list)
    assert len(result) == 2


@patch("course_data_scraper.fetch_html", return_value=None)
def test_extract_data_fetch_fail(mock_fetch):
    result = extract_course_data("SOEN 999", "https://dummy-url.com")
    assert result is None