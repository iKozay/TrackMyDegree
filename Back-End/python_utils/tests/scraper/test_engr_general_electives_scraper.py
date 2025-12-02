import pytest
from unittest.mock import patch, MagicMock
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scraper import engr_general_electives_scraper as scraper


@pytest.fixture(autouse=True)
def reset_globals():
    scraper.courses = []
    scraper.course_codes = []
    yield
    scraper.courses = []
    scraper.course_codes = []


def make_tr(index, links=None):
    tr = MagicMock()
    if links is None:
        links = []
    tr.find_all.side_effect = lambda tag: links if tag == 'a' else []
    return tr


def make_fake_tbody(faculty_links1=None, faculty_links2=None, excluded=None):
    if faculty_links1 is None:
        faculty_links1 = []
    if faculty_links2 is None:
        faculty_links2 = []
    if excluded is None:
        excluded = []
    exclusion_tr = make_tr(4, [MagicMock(text=text) for text in excluded])
    tbody = [
        make_tr(0),
        make_tr(1, faculty_links1),
        make_tr(2, faculty_links2),
        make_tr(3),
        exclusion_tr
    ]
    return tbody


@patch("scraper.course_data_scraper.fetch_html")
@patch("scraper.course_data_scraper.extract_course_data")
def test_scrape_electives_basic(mock_extract, mock_fetch):
    # Two faculties, each returns a different course
    faculty1 = MagicMock()
    faculty1.get.return_value = "faculty1.html"
    faculty2 = MagicMock()
    faculty2.get.return_value = "faculty2.html"

    fake_soup = MagicMock()
    fake_soup.find.return_value = fake_soup
    fake_soup.find_all.return_value = make_fake_tbody(
        faculty_links1=[faculty1],
        faculty_links2=[faculty2],
        excluded=["EXCL101"]
    )
    mock_fetch.return_value = fake_soup

    # Each faculty returns different courses
    def side_effect_extract(arg, url):
        if url.endswith("faculty1.html"):
            return [{"_id": "CS101", "name": "Course 1"}, {"_id": "EXCL101", "name": "Excluded"}]
        else:
            return [{"_id": "CS102", "name": "Course 2"}]

    mock_extract.side_effect = side_effect_extract

    codes, courses = scraper.scrape_electives()

    # EXCL101 is excluded, CS101 + CS102 included
    assert set(codes) == {"CS101", "CS102"}
    assert {c["_id"] for c in courses} == {"CS101", "CS102"}


@patch("scraper.course_data_scraper.fetch_html")
def test_scrape_electives_empty_tbody(mock_fetch):
    fake_soup = MagicMock()
    fake_soup.find.return_value = fake_soup
    fake_soup.find_all.return_value = [MagicMock() for _ in range(5)]  # still 5 rows to avoid IndexError
    mock_fetch.return_value = fake_soup

    # no faculty links, no exclusion links
    codes, courses = scraper.scrape_electives()
    assert codes == []
    assert courses == []


@patch("scraper.course_data_scraper.fetch_html")
@patch("scraper.course_data_scraper.extract_course_data")
def test_scrape_electives_all_excluded(mock_extract, mock_fetch):
    tbody = make_fake_tbody(
        faculty_links1=[],
        faculty_links2=[],
        excluded=["CS101"]
    )
    fake_soup = MagicMock()
    fake_soup.find.return_value = fake_soup
    fake_soup.find_all.return_value = tbody
    mock_fetch.return_value = fake_soup

    mock_extract.return_value = [{"_id": "CS101", "name": "Course 1"}]

    codes, courses = scraper.scrape_electives()
    assert codes == []
    assert courses == []


@patch("scraper.course_data_scraper.fetch_html")
def test_scrape_electives_no_faculties(mock_fetch):
    tbody = make_fake_tbody(
        faculty_links1=[],
        faculty_links2=[],
        excluded=[]
    )
    fake_soup = MagicMock()
    fake_soup.find.return_value = fake_soup
    fake_soup.find_all.return_value = tbody
    mock_fetch.return_value = fake_soup

    codes, courses = scraper.scrape_electives()
    assert codes == []
    assert courses == []