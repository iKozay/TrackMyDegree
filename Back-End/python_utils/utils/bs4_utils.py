from bs4 import BeautifulSoup, ResultSet
from bs4.dammit import EncodingDetector
from urllib.parse import urljoin
from .web_utils import get as web_get
import re
import sys
import os
from typing import Any

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from models import AnchorLink, CoursePool
from .parsing_utils import REGEX_ALL, REGEX_NONE, COURSE_REGEX, clean_text, get_course_sort_key

def get_soup(url: str) -> BeautifulSoup:
    """
    Fetches the content from the URL and returns a BeautifulSoup object.
    """
    resp = web_get(url)
    encoding = (
        EncodingDetector.find_declared_encoding(resp.content, is_html=True)
        or (resp.encoding if 'charset' in resp.headers.get('content-type', '').lower() else None)
    )
    return BeautifulSoup(resp.content, 'lxml', from_encoding=encoding)

def _get_all_links_from_element(
        url: str,
        elements: ResultSet[Any],
        include_regex: str = REGEX_ALL,
        require_exact_regex_match: bool = False,
        exclude_regex: str = REGEX_NONE ) -> list[AnchorLink]:
    """
    Extracts all anchor links from the given BeautifulSoup elements, filtering by include/exclude regex.
    Optionally, only the exact regex match is used as the link text.

    Args:
        url (str): The base URL for resolving relative links.
        elements (ResultSet[Any]): BeautifulSoup elements to search for anchor tags.
        include_regex (str): Regex pattern to include links whose text matches.
        require_exact_regex_match (bool): If True, use only the matched regex group as link text.
        exclude_regex (str): Regex pattern to exclude links whose text matches.

    Returns:
        list[AnchorLink]: List of AnchorLink objects with cleaned text and absolute URLs.
    """
    results = []
    for element in elements:
        if element:
            for a_tag in element.find_all("a", href=True):
                link_text = " ".join(a_tag.stripped_strings)
                matched_text = re.search(include_regex, link_text)

                if matched_text and not re.search(exclude_regex, link_text):
                    if require_exact_regex_match:
                        link_text = matched_text.group(0)
                    results.append(AnchorLink(
                        text=clean_text(link_text),
                        url=urljoin(url, a_tag["href"])
                    ))

    return results

def get_all_links_from_div(
        url: str,
        div_class: list[str],
        div_title: str = None,
        include_regex: str = REGEX_ALL,
        require_exact_regex_match: bool = False,
        exclude_regex: str = REGEX_NONE) -> list[AnchorLink]:
    """
    Finds all anchor links within <div> elements matching the given class and optional title.
    Filters links by include/exclude regex and returns AnchorLink objects.

    Args:
        url (str): The base URL for resolving relative links.
        div_class (list[str]): List of class names the div must have.
        div_title (str, optional): Title attribute the div must have.
        include_regex (str): Regex pattern to include links whose text matches.
        require_exact_regex_match (bool): If True, use only the matched regex group as link text.
        exclude_regex (str): Regex pattern to exclude links whose text matches.

    Returns:
        list[AnchorLink]: List of AnchorLink objects found in the divs.
    """
    soup = get_soup(url)
    elements = soup.find_all("div", class_=lambda c: c and all(cls in c.split() for cls in div_class), attrs={"title": div_title} if div_title else {})
    return _get_all_links_from_element(url, elements, include_regex, require_exact_regex_match, exclude_regex)

def extract_coursepool_and_required_credits(url: str, table_element) -> list[tuple[AnchorLink, float]]:
    """
    Extracts course pool links and their required credits from a table element.
    Each row should have credits in the first column and course pool links in the second.

    Args:
        url (str): The base URL for resolving relative links.
        table_element: BeautifulSoup table element containing course pool info.

    Returns:
        list[tuple[AnchorLink, float]]: List of (AnchorLink, credits) tuples for each course pool.
    """
    coursepools_map = []
    rows = table_element.find_all("tr")
    for row in rows:
        tds = row.find_all("td")
        if len(tds) < 2:
            continue
        # Extract credits from first column
        try:
            credits_text = " ".join(tds[0].stripped_strings)
            pool_credits = float(credits_text)
        except (ValueError, IndexError):
            continue
        links = _get_all_links_from_element(url=url, elements=[tds[1]], exclude_regex=COURSE_REGEX)
        # Map each link to the credit value
        for link in links:
            coursepools_map.append((link, pool_credits))
    # Remove duplicates while preserving order based on AnchorLink.text
    seen_texts = set()
    unique_coursepools_map = []
    for link, credits in coursepools_map:
        if link.text not in seen_texts:
            unique_coursepools_map.append((link, credits))
            seen_texts.add(link.text)
    return unique_coursepools_map
    

def extract_coursepool_courses(url: str, course_pool: CoursePool, automatically_parse_sublinks: bool = True) -> bool:
    """
    Populates the given CoursePool with course IDs found in the corresponding div on the page.
    Optionally attempts to parse sublinks if no courses are found directly.

    Args:
        url (str): The URL of the page containing the course pool.
        course_pool (CoursePool): The CoursePool object to populate.
        automatically_parse_sublinks (bool): If True, try to parse sublinks if direct extraction fails.

    Returns:
        bool: True if courses were found and assigned, False otherwise.
    """
    soup = get_soup(url)
    course_pool_div = soup.find("div", class_="defined-group", attrs={"title": lambda t: t and clean_text(t).strip() == clean_text(course_pool.name).strip()})

    if course_pool_div:
        course_ids = []
        if automatically_parse_sublinks:
            course_ids = _get_all_links_from_element(url, [course_pool_div], include_regex=COURSE_REGEX, require_exact_regex_match=True)
            if not course_ids:
                sublinks = _get_all_links_from_element(url, [course_pool_div], exclude_regex=COURSE_REGEX)
                for sublink in sublinks:
                    title = sublink.text
                    sublink_div = soup.find("div", class_="defined-group", attrs={"title": lambda t: t and clean_text(t).strip() == clean_text(title).strip()})
                    course_ids = _get_all_links_from_element(url, [sublink_div], include_regex=COURSE_REGEX, require_exact_regex_match=True)
        else:
            course_ids = _get_all_links_from_element(url, [course_pool_div], include_regex=COURSE_REGEX, require_exact_regex_match=True)

        seen_texts = set()
        unique_courses = []
        for course in course_ids:
            if course.text not in seen_texts:
                unique_courses.append(course.text)
                seen_texts.add(course.text)

        course_ids = sorted(unique_courses, key=get_course_sort_key)
        course_pool.courses = course_ids
        return True
    return False