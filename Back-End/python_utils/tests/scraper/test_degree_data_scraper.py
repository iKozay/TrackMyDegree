import sys
import pytest
from unittest.mock import patch, MagicMock
import requests
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

class MockCourseDataScraper:
    def extract_course_data(self, course_code, url):
        return {"_id": course_code, "code": course_code, "title": "Mock Title", "credits": 3}
    def get_coop_courses(self):
        return [{"_id": "CWT 123", "code": "CWT 123", "title": "Coop", "credits": 0}]

class MockEngrElectivesScraper:
    def scrape_electives(self):
        return [
            ["ELEC 390", "ENGR 400"],
            [{"_id": "ELEC 390"}, {"_id": "ENGR 400"}]
        ]

@pytest.fixture
def mock_requests_get(monkeypatch):
    def create_mock_response(content=b"<html></html>"):
        mock = MagicMock()
        mock.content = content
        mock.encoding = "utf-8"
        mock.status_code = 200
        return mock

    monkeypatch.setattr("requests.get", lambda url, headers=None: create_mock_response())
    return create_mock_response

@pytest.fixture
def fake_html():
    return """
    <html>
    <body>
        <div class="title program-title">
            <h3>BEng in Mechanical Engineering (120 credits)</h3>
        </div>
        <div class="program-required-courses defined-group">
            <table>
                <tr>
                    <td>30</td>
                    <td><a href="#core">Engineering Core</a></td>
                </tr>
            </table>
        </div>
        <div class="defined-group" title="Engineering Core">
            <div class="formatted-course">
                <span class="course-code-number">
                    <a href="elec275.html">ELEC 275</a>
                </span>
            </div>
        </div>
    </body>
    </html>
    """

class DummyResponse:
    def __init__(self, html, status_code=200, encoding="utf-8"):
        self.content = html.encode(encoding)
        self.status_code = status_code
        self.encoding = encoding
        self.headers = {"content-type": "text/html; charset=utf-8"}

    def raise_for_status(self):
        # mimic requests.Response.raise_for_status()
        if self.status_code >= 400:
            err = requests.HTTPError(f"{self.status_code} Error")
            err.response = self
            raise err
        return None

@patch("scraper.degree_data_scraper.course_data_scraper", new=MockCourseDataScraper())
@patch("scraper.degree_data_scraper.engr_general_electives_scraper", new=MockEngrElectivesScraper())
def test_degree_scraper_structural_integrity(monkeypatch, fake_html):
    from scraper.degree_data_scraper import DegreeDataScraper

    degree_data_scraper = DegreeDataScraper()
    fake_url = "http://example.com/fake-degree-page.html"

    def mock_get(url, headers=None):
        return DummyResponse(fake_html)

    monkeypatch.setattr(requests, "get", mock_get)
    test_args = ["script_name.py", fake_url]
    monkeypatch.setattr(sys, "argv", test_args)

    try:
        output_data = degree_data_scraper.scrape_degree(fake_url)
    except SystemExit:
        pytest.fail("scrape_degree raised SystemExit")

    assert isinstance(output_data, dict)
    assert "degree" in output_data
    assert "course_pool" in output_data
    assert "courses" in output_data

    degree = output_data["degree"]
    assert isinstance(degree.get("name"), str)
    assert degree["totalCredits"] > 0
    assert isinstance(degree["coursePools"], list)
    assert len(degree["coursePools"]) >= 1

    course_pool = output_data["course_pool"]
    assert isinstance(course_pool, list)
    assert len(course_pool) >= 1
    # At least one pool should have courses (some pools may be empty after restrictions)
    assert any(len(pool.get("courses", [])) > 0 for pool in course_pool)

    for pool in course_pool:
        assert isinstance(pool, dict)
        assert isinstance(pool.get("name"), str)
        assert isinstance(pool.get("courses"), list)

    courses = output_data["courses"]
    assert isinstance(courses, list)
    assert len(courses) >= 2
    for course in courses:
        assert isinstance(course, dict)
        assert isinstance(course.get("_id"), str)

@patch("scraper.degree_data_scraper.course_data_scraper", new=MockCourseDataScraper())
@patch("scraper.degree_data_scraper.engr_general_electives_scraper", new=MockEngrElectivesScraper())
def test_handle_engineering_variants(monkeypatch):
    from scraper.degree_data_scraper import DegreeDataScraper

    s = DegreeDataScraper()
    s.courses = []

    s.course_pool = [{"name": "Engineering Core", "creditsRequired": 30, "courses": ["ELEC 275", "ENGR 202", "ENGR 392"]}]
    s.degree = {"coursePools": []}
    s.handle_engineering_core_restrictions("BEng in Mechanical Engineering")
    assert "ELEC 275" not in s.course_pool[0]["courses"]

    s.course_pool = [{"name": "Engineering Core", "creditsRequired": 30, "courses": ["ELEC 275"]}]
    s.handle_engineering_core_restrictions("BEng in Electrical Engineering")
    assert "ELEC 273" in s.course_pool[0]["courses"]

    s.course_pool = [{"name": "Engineering Core", "creditsRequired": 30, "courses": ["ENGR 202", "ENGR 392"]}]
    s.handle_engineering_core_restrictions("BEng in Building Engineering")
    assert "BLDG 482" in s.course_pool[0]["courses"]

    s.course_pool = [{"name": "Engineering Core", "creditsRequired": 30, "courses": []}]
    s.handle_engineering_core_restrictions("BEng in Industrial Engineering")
    found = any(c["_id"] == "ACCO 220" for c in s.courses)
    assert found

@patch("scraper.degree_data_scraper.course_data_scraper", new=MockCourseDataScraper())
def test_get_courses_both_paths(monkeypatch, mock_requests_get):
    from scraper.degree_data_scraper import DegreeDataScraper
    from bs4 import BeautifulSoup

    s = DegreeDataScraper()
    html = """
    <div class='defined-group' title='Core'>
        <div class='formatted-course'>
            <span class='course-code-number'><a href='link.html'>COMP 248</a></span>
        </div>
    </div>
    """
    s.soup = BeautifulSoup(html, "lxml")
    s.url_received = "http://fakeurl.com"

    def fake_get_page(url):
        html2 = """
        <div class='formatted-course'>
            <span class='course-code-number'><a href='link2.html'>COMP 249</a></span>
        </div>
        """
        return BeautifulSoup(html2, "lxml")

    monkeypatch.setattr(s, "get_page", fake_get_page)
    s.temp_url = "notinargv"
    res = s.get_courses("fake", "Core")
    assert isinstance(res, list)
    assert any("COMP" in c for c in res)

@pytest.fixture
def mock_comp_gen_electives(monkeypatch):
    def fake_get_comp_gen_electives(url, combined_courses):
        return (
            ["COMP 352", "COMP 346"],
            [
                {"_id": "COMP 352"},
                {"_id": "COMP 346"}
            ]
        )
    monkeypatch.setattr(
        "scraper.degree_data_scraper.comp_utils.get_comp_gen_electives",
        fake_get_comp_gen_electives
    )

@pytest.fixture
def mock_comp_electives(monkeypatch):
    def fake_get_comp_electives():
        return (
            ["COMP 325", "COMP 335"],
            [
                {"_id": "COMP 325"},
                {"_id": "COMP 335"}
            ]
        )
    monkeypatch.setattr(
        "scraper.degree_data_scraper.comp_utils.get_comp_electives",
        fake_get_comp_electives
    )

@patch("scraper.degree_data_scraper.course_data_scraper", new=MockCourseDataScraper())
def test_get_courses_general_electives_bcomp(mock_comp_gen_electives, monkeypatch, mock_requests_get):
    from scraper.degree_data_scraper import DegreeDataScraper

    s = DegreeDataScraper()
    s.url_received = "http://fakeurl.com"
    s.temp_url = "fake"
    # REQUIRED: last two pools are read
    s.course_pool = [
        {"courses": ["COMP 248"]},
        {"courses": ["COMP 249"]}
    ]
    result = s.get_courses("fake.html", "General Electives: BCompSc")
    assert result == ["COMP 352", "COMP 346"]
    # side effects
    assert any(c["_id"] == "COMP 352" for c in s.courses)
    assert any(c["_id"] == "COMP 346" for c in s.courses)

@patch("scraper.degree_data_scraper.course_data_scraper", new=MockCourseDataScraper())
def test_get_courses_computer_science_electives(mock_comp_electives, monkeypatch, mock_requests_get):
    from scraper.degree_data_scraper import DegreeDataScraper
    from bs4 import BeautifulSoup

    # Mock comp_utils functions
    def fake_get_comp_electives():
        return (
            ["COMP 325", "COMP 335"],
            [
                {"_id": "COMP 325"},
                {"_id": "COMP 335"}
            ]
        )

    monkeypatch.setattr(
        "scraper.degree_data_scraper.comp_utils.get_comp_electives",
        fake_get_comp_electives
    )

    monkeypatch.setattr(
        "scraper.degree_data_scraper.course_data_scraper.extract_course_data",
        lambda code, url: {"_id": code, "code": code, "title": "Mock Title", "credits": 3}
    )

    monkeypatch.setattr("requests.get", lambda url, headers=None: create_mock_response())

    s = DegreeDataScraper()
    s.url_received = "http://fakeurl.com"
    s.temp_url = "fake"
    s.courses = []
    html = """
    <div class="defined-group" title="Computer Science Electives">
        <div class="formatted-course">
            <span class="course-code-number">
                <a href="link.html">COMP 232</a>
            </span>
        </div>
    </div>
    """
    s.soup = BeautifulSoup(html, "lxml")

    def fake_get_page(url):
        return s.soup

    monkeypatch.setattr(s, "get_page", fake_get_page)

    result = s.get_courses("fake", "Computer Science Electives")
    # Check the courses were found
    assert "COMP 232" in result
    assert "COMP 325" in result
    assert "COMP 335" in result
    # side effects
    assert any(c["_id"] == "COMP 325" for c in s.courses)
    assert any(c["_id"] == "COMP 335" for c in s.courses)

@patch("scraper.degree_data_scraper.course_data_scraper", new=MockCourseDataScraper())
def test_get_courses_option_in_pool_name(monkeypatch, mock_requests_get):
    """Test the case where output==[] and 'Option' is in pool_name"""
    from scraper.degree_data_scraper import DegreeDataScraper
    from bs4 import BeautifulSoup

    monkeypatch.setattr(
        "scraper.degree_data_scraper.course_data_scraper.extract_course_data",
        lambda code, url: {"_id": code, "code": code, "title": "Mock Title", "credits": 3}
    )
    s = DegreeDataScraper()
    s.url_received = "http://fakeurl.com"
    s.temp_url = "fake"
    s.courses = []
    
    # HTML with a pool that has no direct courses but has links to sub-options
    html = """
    <div class="defined-group" title="Software Option">
        <a href="software-track1.html">Track 1</a>
        <a href="software-track2.html">Track 2</a>
    </div>
    """
    s.soup = BeautifulSoup(html, "lxml")

    # Mock get_page to return appropriate content for each URL
    def fake_get_page(url):
        if "track1" in url:
            track1_html = """
            <div class="formatted-course">
                <span class="course-code-number">
                    <a href="comp450.html">COMP 450</a>
                </span>
            </div>
            """
            return BeautifulSoup(track1_html, "lxml")
        elif "track2" in url:
            track2_html = """
            <div class="formatted-course">
                <span class="course-code-number">
                    <a href="comp451.html">COMP 451</a>
                </span>
            </div>
            """
            return BeautifulSoup(track2_html, "lxml")
        return BeautifulSoup("<html></html>", "lxml")

    monkeypatch.setattr(s, "get_page", fake_get_page)
    monkeypatch.setattr("requests.get", lambda url, headers=None: create_mock_response(b"<html></html>"))

    # Call with a fragment href to trigger same-page logic, then option processing
    result = s.get_courses("#software-option", "Software Option")

    assert isinstance(result, list)
    assert "COMP 450" in result
    assert "COMP 451" in result
    assert any(c["_id"] == "COMP 450" for c in s.courses)
    assert any(c["_id"] == "COMP 451" for c in s.courses)

@patch("scraper.degree_data_scraper.course_data_scraper", new=MockCourseDataScraper())
def test_get_courses_elective_in_pool_name(monkeypatch, mock_requests_get):
    """Test the case where output==[] and 'Elective' is in pool_name"""
    from scraper.degree_data_scraper import DegreeDataScraper
    from bs4 import BeautifulSoup

    monkeypatch.setattr(
        "scraper.degree_data_scraper.course_data_scraper.extract_course_data",
        lambda code, url: {"_id": code, "code": code, "title": "Mock Title", "credits": 3}
    )

    monkeypatch.setattr("requests.get", lambda url, headers=None: create_mock_response())

    s = DegreeDataScraper()
    s.url_received = "http://fakeurl.com/fake"
    s.temp_url = "fake"
    s.courses = []
    
    # HTML with an empty defined-group for "Math Elective", so output==[]
    # Then the fallback logic kicks in and finds all formatted-course divs
    html = """
    <div class="defined-group" title="Math Elective">
        <!-- Empty, no formatted-course divs here -->
    </div>
    <div class="formatted-course">
        <span class="course-code-number">
            <a href="math200.html">MATH 200</a>
        </span>
    </div>
    <div class="formatted-course">
        <span class="course-code-number">
            <a href="math201.html">MATH 201</a>
        </span>
    </div>
    """
    s.soup = BeautifulSoup(html, "lxml")
    def fake_get_page(url):
        return s.soup
    monkeypatch.setattr(s, "get_page", fake_get_page)
    result = s.get_courses("fake", "Math Elective")
    
    # Should get all formatted courses from the page
    assert isinstance(result, list)
    assert "MATH 200" in result
    assert "MATH 201" in result
    assert any(c["_id"] == "MATH 200" for c in s.courses)
    assert any(c["_id"] == "MATH 201" for c in s.courses)

@patch("scraper.degree_data_scraper.course_data_scraper", new=MockCourseDataScraper())
def test_find_same_page_group_last_resort_scan(monkeypatch, mock_requests_get):
    """Test the last resort scanning logic when fragment and title matching fail"""
    from scraper.degree_data_scraper import DegreeDataScraper
    from bs4 import BeautifulSoup

    s = DegreeDataScraper()
    html = """
    <div class="defined-group" title="Some Other Title">
        <p>This group contains engineering core in its text content</p>
    </div>
    <div class="defined-group" title="Another Group">
        <p>Unrelated content</p>
    </div>
    """
    s.soup = BeautifulSoup(html, "lxml")
    s.url_received = "http://fakeurl.com"

    # Test with search term that will match after normalization
    result = s._find_same_page_group("engineering core", "")

    assert result is not None
    assert "Some Other Title" in result.get("title", "")

    # Also test the case where no match is found
    result_none = s._find_same_page_group("Nonexistent Term", "")
    assert result_none is None

@patch("scraper.degree_data_scraper.course_data_scraper", new=MockCourseDataScraper())
@patch("scraper.degree_data_scraper.engr_general_electives_scraper", new=MockEngrElectivesScraper())
def test_scrape_degree_edge_cases(monkeypatch):
    """Test edge cases in the main scraping loop"""
    from scraper.degree_data_scraper import DegreeDataScraper

    html_with_edge_cases = """
    <html>
    <body>
        <div class="title program-title">
            <h3>BEng in Industrial Engineering (90 credits)</h3>
        </div>
        <div class="program-required-courses defined-group">
            <table>
                <tr>
                    <!-- Row with no td -->
                </tr>
                <tr>
                    <td>No credits text here</td>
                    <td><a href="#core">Core Courses</a></td>
                </tr>
                <tr>
                    <td>15</td>
                    <td>
                        <a href="">Empty href</a>
                        <a>No href</a>
                        <a href="#valid">Valid Link</a>
                    </td>
                </tr>
            </table>
        </div>
        <div class="defined-group" title="Valid Link">
            <div class="formatted-course">
                <span class="course-code-number">
                    <a href="test101.html">TEST 101</a>
                </span>
            </div>
        </div>
    </body>
    </html>
    """

    class DummyResponse:
        def __init__(self, html):
            self.content = html.encode('utf-8')
            self.status_code = 200
            self.encoding = "utf-8"
            self.headers = {"content-type": "text/html; charset=utf-8"}
        def raise_for_status(self):
            return None

    def mock_get(url, headers=None):
        return DummyResponse(html_with_edge_cases)

    monkeypatch.setattr("requests.get", mock_get)

    s = DegreeDataScraper()
    result = s.scrape_degree("http://test-url.com")

    # Should handle edge cases gracefully
    assert result["degree"]["name"] == "BEng in Industrial Engineering"
    assert result["degree"]["totalCredits"] == 90
    # Should have found the valid link and processed it
    assert len(result["course_pool"]) >= 1
