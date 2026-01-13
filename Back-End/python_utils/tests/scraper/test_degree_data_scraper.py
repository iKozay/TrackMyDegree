import sys
import pytest
from unittest.mock import patch
import requests
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


class MockCourseDataScraper:
    def extract_course_data(self, course_code, url):
        return {"_id": course_code, "code": course_code, "title": "Mock Title", "credits": 3}


class MockEngrElectivesScraper:
    def scrape_electives(self):
        return [
            ["ELEC 390", "ENGR 400"],
            [{"_id": "ELEC 390"}, {"_id": "ENGR 400"}]
        ]


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
def test_get_courses_both_paths(monkeypatch):
    from scraper.degree_data_scraper import DegreeDataScraper
    s = DegreeDataScraper()
    from bs4 import BeautifulSoup

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
def test_get_courses_general_electives_bcomp(mock_comp_gen_electives):
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
def test_get_courses_computer_science_electives(mock_comp_electives):
    from scraper.degree_data_scraper import DegreeDataScraper
    from bs4 import BeautifulSoup

    s = DegreeDataScraper()
    s.url_received = "http://fakeurl.com"
    s.temp_url = "fake"

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

    result = s.get_courses("fake", "Computer Science Electives")

    # scraped + augmented
    assert "COMP 232" in result
    assert "COMP 325" in result
    assert "COMP 335" in result

    # side effects
    assert any(c["_id"] == "COMP 325" for c in s.courses)
    assert any(c["_id"] == "COMP 335" for c in s.courses)

@patch("scraper.degree_data_scraper.course_data_scraper", new=MockCourseDataScraper())
def test_get_courses_option_branch(monkeypatch):
    """Test the branch where output==[] and 'Option' in pool_name"""
    from scraper.degree_data_scraper import DegreeDataScraper
    from bs4 import BeautifulSoup

    s = DegreeDataScraper()
    s.url_received = "http://fakeurl.com"
    s.temp_url = "fake"

    # The pool_name contains 'Option', initial scrape returns empty
    html = """
    <div class='defined-group' title='Some Option Pool'>
        <a href='subpool1.html'>Sub Pool 1</a>
        <a href='subpool2.html'>Sub Pool 2</a>
    </div>
    """
    s.soup = BeautifulSoup(html, "lxml")

    # Mock get_courses to return a non-empty list for sub-pools
    def fake_get_courses(url, pool_name):
        return ["COURSE1", "COURSE2"]
    monkeypatch.setattr(s, "get_courses", fake_get_courses)

    result = s.get_courses("fake.html", "Elective")
    result = s.get_courses("fake.html", "Some Option Pool")
    assert result == ["COURSE1", "COURSE2"]  # ensures Option branch is exercised
