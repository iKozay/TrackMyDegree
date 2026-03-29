import pytest
import sys
import os
import json
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scraper.degree_data_scraper import DegreeDataScraper
from scraper.gina_cody_degree_scraper import GinaCodyDegreeScraper
from scraper.course_data_scraper import CourseDataScraper
import scraper.course_data_scraper as course_data_scraper_module
from models import ECPDegreeIDs, Course, AnchorLink, ProgramRequirements, serialize

TESTED_DEGREES = {
    "BEng in Aerospace Engineering Option: Aerodynamics and Propulsion",
    "BEng in Aerospace Engineering Option: Aerospace Structures and Materials",
    "BEng in Aerospace Engineering Option: Avionics and Aerospace Systems",
    "BEng in Industrial Engineering",
    "BEng in Software Engineering",
    "BCompSc in Computer Science",
    "BCompSc Joint Major in Computation Arts and Computer Science",
    "BCompSc Joint Major in Data Science",
    "BCompSc in Health and Life Sciences",
    ECPDegreeIDs.ENGR_ECP_ID,
    ECPDegreeIDs.COMP_ECP_ID,
    ECPDegreeIDs.COMP_CA_ECP_ID,
    ECPDegreeIDs.COMP_DS_ECP_ID,
    ECPDegreeIDs.COMP_HLS_ECP_ID,
    "Co-op Program",
}

class MockHttpResponse:
    """Minimal HTTP response used to satisfy web_utils and bs4_utils consumers."""

    def __init__(self, text: str, status_code: int = 200, headers: dict | None = None):
        self.status_code = status_code
        self.text = text
        self.content = text.encode("utf-8")
        self.encoding = "utf-8"
        self.headers = headers or {"content-type": "text/html; charset=utf-8"}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP error {self.status_code}")

    def json(self):
        raise NotImplementedError("JSON payload not configured for this mocked response")


@pytest.fixture
def mock_web_utils_requests(monkeypatch):
    """
    Intercept *all* HTTP calls made through utils.web_utils.get(), regardless of caller.

    Why this works:
    - bs4_utils.get_soup imports web_get from utils.web_utils.
    - web_get always calls utils.web_utils.session.get(...).
    - Patching session.get captures requests even when web_get was imported elsewhere.
    """
    fixture_dir = Path(__file__).resolve().parents[1] / "fixtures" / "html"
    routes: dict[str, MockHttpResponse] = {}

    def add_html(url: str, fixture_name: str, status_code: int = 200):
        html = (fixture_dir / fixture_name).read_text(encoding="utf-8")
        routes[url] = MockHttpResponse(text=html, status_code=status_code)

    def fake_session_get(url: str, timeout=60, **kwargs):
        if url in routes:
            return routes[url]
        raise AssertionError(f"Unexpected web request: {url}")

    monkeypatch.setattr("utils.web_utils.session.get", fake_session_get)
    return add_html

@pytest.fixture
def mock_get_degree_links(monkeypatch):
    """Mock function to replace get_all_links_from_div"""
    links = [
        AnchorLink(text="BEng in Aerospace Engineering", url="http://aero.com"),
        AnchorLink(text="BEng in Industrial Engineering", url="http://indu.com"),
        AnchorLink(text="BEng in Software Engineering", url="http://soen.com"),
        AnchorLink(text="BCompSc in Computer Science", url="http://comp.com"),
        AnchorLink(text="BCompSc Joint Major in Computation Arts and Computer Science", url="http://comp_arts.com"),
        AnchorLink(text="BCompSc Joint Major in Data Science", url="http://comp_ds.com"),
        AnchorLink(text="BCompSc in Health and Life Sciences", url="http://comp_hls.com"),
        AnchorLink(text="Extended Credit Program", url="http://ecp_eng.com"),
        AnchorLink(text="Section 71.70.3 Extended Credit Program", url="http://ecp_comp.com"),
        AnchorLink(text="Extended Credit Program - Health and Life Sciences", url="http://ecp_hls.com"),
    ]
    monkeypatch.setattr(
        "scraper.degree_data_scraper.get_all_links_from_div",
        lambda url, class_names, exclude_regex=None: links,
    )
    return links

@pytest.fixture
def expected_fixture_loader():
    expected_dir = Path(__file__).resolve().parents[1] / "fixtures" / "expected"

    def load_expected(file_name: str) -> dict:
        with open(expected_dir / file_name, encoding="utf-8") as fixture_file:
            return json.load(fixture_file)

    return load_expected

@pytest.fixture
def initialized_course_scraper():
    expected_dir = Path(__file__).resolve().parents[1] / "fixtures" / "expected"
    all_courses_path = expected_dir / "All_Courses.json"
    course_scraper = CourseDataScraper()

    CourseDataScraper.all_courses = {}
    with open(all_courses_path, encoding="utf-8") as fixture_file:
        all_courses = json.load(fixture_file)
    for course_data in all_courses:
        course = Course(**course_data)
        CourseDataScraper.all_courses[course._id] = course

    course_data_scraper_module.course_scraper_instance = course_scraper
    try:
        yield course_scraper
    finally:
        course_data_scraper_module.course_scraper_instance = None
        CourseDataScraper.all_courses = {}

class TestDegreeDataScraper:
    """Test DegreeDataScraper orchestration class"""

    @pytest.fixture(autouse=True)
    def setup(self, monkeypatch):
        original_init_scrapers = DegreeDataScraper._init_scrapers

        def init_supported_scrapers_only(scraper_self):
            scraper_self.degree_scraper_config = [
                config
                for config in scraper_self.degree_scraper_config
                if config.long_name in TESTED_DEGREES
            ]
            return original_init_scrapers(scraper_self)

        monkeypatch.setattr(DegreeDataScraper, "_init_scrapers", init_supported_scrapers_only)

    def test_get_degree_names(self, mock_get_degree_links):
        """Test getting the exact degree names expanded from the supported discovered links."""
        scraper = DegreeDataScraper()
        names = scraper.get_degree_names()
        assert isinstance(names, list)
        assert len(names) == len(scraper.degree_scrapers)

    def test_scrape_degree_by_name_success(self, mock_get_degree_links, mock_web_utils_requests, expected_fixture_loader, initialized_course_scraper):
        """Test scraping a degree by name successfully"""
        # Register the fixture HTML for any web_utils request (works across all callers).
        mock_web_utils_requests("http://aero.com", "Aerospace_Engineering.html")
        mock_web_utils_requests(GinaCodyDegreeScraper.ENGINEERING_CORE_COURSES_URL, "Engineering_Core.html")

        scraper = DegreeDataScraper()
        result = scraper.scrape_degree_by_name("BEng in Aerospace Engineering Option: Aerodynamics and Propulsion")
        expected = expected_fixture_loader("BEng_in_Aerospace_Engineering_Option_Aerodynamics_and_Propulsion.json")

        assert serialize(result) == expected

    def test_scrape_degree_by_name_not_found(self, mock_get_degree_links):
        """Test scraping non-existent degree raises error"""
        scraper = DegreeDataScraper()
        with pytest.raises(ValueError, match="Degree scraper for 'NonExistent' not found"):
            scraper.scrape_degree_by_name("NonExistent")

    def test_scrape_all_degrees(self, mock_get_degree_links, mock_web_utils_requests, expected_fixture_loader, initialized_course_scraper):
        """Test scraping all available degrees"""
        scraper = DegreeDataScraper()

        # Register fixtures for all degree links
        mock_web_utils_requests("http://aero.com", "Aerospace_Engineering.html")
        mock_web_utils_requests("http://indu.com", "Industrial_Engineering.html")
        mock_web_utils_requests("http://soen.com", "Software_Engineering.html")
        mock_web_utils_requests("http://comp.com", "Computer_Science.html")
        mock_web_utils_requests("http://comp_arts.com", "Computation_Arts_and_Computer_Science.html")
        mock_web_utils_requests("http://comp_ds.com", "Data_Science.html")
        mock_web_utils_requests("http://comp_hls.com", "Health_and_Life_Sciences.html")
        mock_web_utils_requests("http://ecp_eng.com", "Extended_Credit_Program_Engineering.html")
        mock_web_utils_requests("http://ecp_comp.com", "Extended_Credit_Program_Computer_Science.html")
        mock_web_utils_requests("http://ecp_hls.com", "Health_and_Life_Sciences.html")
        mock_web_utils_requests(GinaCodyDegreeScraper.ENGINEERING_CORE_COURSES_URL, "Engineering_Core.html")

        mock_web_utils_requests("https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-70-department-of-computer-science-and-software-engineering/section-71-70-2-degree-requirements-bcompsc-.html", "Computer_Science.html")

        results = scraper.scrape_all_degrees()
        assert isinstance(results, list)
        assert len(results) == len(TESTED_DEGREES)
        for result in results:
            assert isinstance(result, ProgramRequirements)
            expected = expected_fixture_loader(f"{result.degree.name.replace(' ', '_').replace(':', '')}.json")
            assert serialize(result) == expected