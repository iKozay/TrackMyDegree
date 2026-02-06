from bs4 import BeautifulSoup
from bs4.dammit import EncodingDetector
from urllib.parse import urljoin
from .web_utils import WebUtils
import re
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from models import AnchorLink
from .parsing_utils import REGEX_ALL, REGEX_NONE

webu = WebUtils()

def get_soup(url: str) -> BeautifulSoup:
    """
    Fetches the content from the URL and returns a BeautifulSoup object.
    """
    resp = webu.get(url)
    encoding = (
        EncodingDetector.find_declared_encoding(resp.content, is_html=True)
        or (resp.encoding if 'charset' in resp.headers.get('content-type', '').lower() else None)
    )
    return BeautifulSoup(resp.content, 'lxml', from_encoding=encoding)

def get_all_links_from_element(
        url: str,
        element_name: str,
        element_class: list[str],
        element_attrs: dict = {},
        include_regex: str = REGEX_ALL,
        require_exact_regex_match: bool = False,
        exclude_regex: str = REGEX_NONE ) -> list[AnchorLink]:
    soup = get_soup(url)

    results = []
    elements = soup.find_all(element_name, class_=lambda c: c and all(cls in c.split() for cls in element_class), attrs=element_attrs)

    for element in elements:
        for a_tag in element.find_all("a", href=True):
            link_text = " ".join(a_tag.stripped_strings)
            matched_text = re.search(include_regex, link_text)

            if matched_text and not re.search(exclude_regex, link_text):
                if require_exact_regex_match:
                    link_text = matched_text.group(0)
                results.append(AnchorLink(
                    text=link_text,
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
    element_attrs = {"title": div_title} if div_title else {}
    return get_all_links_from_element(url, "div", div_class, element_attrs, include_regex, require_exact_regex_match, exclude_regex)