import pytest
import re
from unittest.mock import patch, Mock
import sys, os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Scrapers')))

from course_data_scraper import extract_course_data, clean_text


# ---------- Sample HTML Templates ----------

HTML_VALID = """
<html>
<body>
<div class="course">
  <h3 class="accordion-header xlarge">
    SOEN 357 User Interface Design (3 credits)
  </h3>
  <div class="accordion-body">
    Prerequisite/Corequisite: previously: SOEN 287. Description: Introduction to user interface design.
    Component(s): Lecture Notes: Offered in Fall.
  </div>
</div>
</body>
</html>
"""

HTML_NO_CREDITS = """
<html>
<body>
<div class="course">
  <h3 class="accordion-header xlarge">
    SOEN 390 Software Engineering Project
  </h3>
  <div class="accordion-body">
    Description: A team-based software engineering project.
  </div>
</div>
</body>
</html>
"""

HTML_MULTIPLE_COURSES = """
<html>
<body>
<div class="course">
  <h3 class="accordion-header xlarge">SOEN 228 System Hardware (3 credits)</h3>
  <div class="accordion-body">
    Prerequisite/Corequisite: previously: ENGR 201. Description: Hardware overview.
  </div>
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

def make_mock_response(html):
    mock_resp = Mock(status_code=200, content=html.encode("utf-8"))
    mock_resp.headers = {'content-type': 'text/html; charset=utf-8'}
    mock_resp.encoding = 'utf-8'
    return mock_resp


@patch("course_data_scraper.requests.get")
def test_extract_valid_course(mock_get):
    mock_resp = make_mock_response(HTML_VALID)
    mock_get.return_value = mock_resp

    result = extract_course_data("SOEN 357", "https://dummy-url.com")
    assert result is not None
    assert result["id"] == "SOEN 357"
    assert result["title"] == "User Interface Design"
    assert result["credits"] == 3
    assert "user interface" in result["description"].lower()
    assert "SOEN 287" in result["prerequisites"]
    assert result["corequisites"] == ""
    assert "offeredIN" in result

@patch("course_data_scraper.requests.get")
def test_extract_multiple_courses(mock_get):
    mock_resp = make_mock_response(HTML_MULTIPLE_COURSES)
    mock_get.return_value = mock_resp

    result = extract_course_data("SOEN 357", "https://dummy-url.com")
    assert result["id"] == "SOEN 357"
    assert "design" in result["description"].lower()


@patch("course_data_scraper.requests.get")
def test_extract_missing_sections(mock_get):
    mock_resp = make_mock_response(HTML_MISSING_SECTIONS)
    mock_get.return_value = mock_resp

    result = extract_course_data("SOEN 385", "https://dummy-url.com")
    assert isinstance(result["description"], str)
    assert result["prerequisites"] == ""
    assert result["corequisites"] == ""


@patch("course_data_scraper.requests.get")
def test_failed_request(mock_get):
    mock_resp = Mock(status_code=404)
    mock_resp.headers = {'content-type': 'text/html'}
    mock_resp.encoding = 'utf-8'
    mock_get.return_value = mock_resp

    with pytest.raises(SystemExit):
        extract_course_data("SOEN 357", "https://bad-url.com")


@patch("course_data_scraper.requests.get")
def test_exception_handling(mock_get):
    mock_resp = make_mock_response("<div class='course'></div>")
    mock_get.return_value = mock_resp

    result = extract_course_data("SOEN 999", "https://dummy-url.com")
    assert result is None
