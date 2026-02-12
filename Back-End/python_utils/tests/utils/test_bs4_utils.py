from unittest.mock import patch, MagicMock
import sys
import os

# Add the parent directory to the path to import the modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from utils.bs4_utils import (
    get_soup,
    _get_all_links_from_element,
    get_all_links_from_div,
    extract_coursepool_and_required_credits,
    extract_coursepool_courses
)
from models import CoursePool
from bs4 import BeautifulSoup

@patch('utils.bs4_utils.web_get')
def test_get_soup_success(mock_web_get):
    """Test get_soup with valid HTML content."""
    mock_response = MagicMock()
    mock_response.content = b'<html><body><h1>Test</h1></body></html>'
    mock_response.headers = {'content-type': 'text/html; charset=utf-8'}
    mock_response.encoding = 'utf-8'
    mock_web_get.return_value = mock_response

    result = get_soup("http://example.com")

    assert isinstance(result, BeautifulSoup)
    assert result.find('h1').text == 'Test'
    mock_web_get.assert_called_once_with("http://example.com")

@patch('utils.bs4_utils.web_get')
def test_get_soup_no_charset_in_headers(mock_web_get):
    """Test get_soup when no charset in content-type header."""
    mock_response = MagicMock()
    mock_response.content = b'<html><body>Test</body></html>'
    mock_response.headers = {'content-type': 'text/html'}
    mock_response.encoding = None
    mock_web_get.return_value = mock_response

    result = get_soup("http://example.com")

    assert isinstance(result, BeautifulSoup)
    mock_web_get.assert_called_once_with("http://example.com")

def test_get_all_links_from_element_basic():
    """Test _get_all_links_from_element with basic HTML."""
    html = '<div><a href="/test">Test Link</a></div>'
    soup = BeautifulSoup(html, 'lxml')
    elements = soup.find_all('div')

    result = _get_all_links_from_element("http://example.com", elements)

    assert len(result) == 1
    assert result[0].text == "Test Link"
    assert result[0].url == "http://example.com/test"

def test_get_all_links_from_element_with_include_regex():
    """Test _get_all_links_from_element with include regex."""
    html = '''
    <div>
        <a href="/comp248">COMP 248 Programming</a>
        <a href="/other">Other Link</a>
    </div>
    '''
    soup = BeautifulSoup(html, 'lxml')
    elements = soup.find_all('div')

    result = _get_all_links_from_element(
        "http://example.com", 
        elements, 
        include_regex=r'COMP \d+',
        require_exact_regex_match=True
    )

    assert len(result) == 1
    assert result[0].text == "COMP 248"
    assert result[0].url == "http://example.com/comp248"

def test_get_all_links_from_element_with_exclude_regex():
    """Test _get_all_links_from_element with exclude regex."""
    html = '''
    <div>
        <a href="/comp248">COMP 248 Programming</a>
        <a href="/other">Other Link</a>
    </div>
    '''
    soup = BeautifulSoup(html, 'lxml')
    elements = soup.find_all('div')

    result = _get_all_links_from_element(
        "http://example.com", 
        elements, 
        exclude_regex=r'COMP \d+'
    )

    assert len(result) == 1
    assert result[0].text == "Other Link"
    assert result[0].url == "http://example.com/other"

def test_get_all_links_from_element_no_matches():
    """Test _get_all_links_from_element when include regex matches nothing."""
    html = '<div><a href="/test">Test Link</a></div>'
    soup = BeautifulSoup(html, 'lxml')
    elements = soup.find_all('div')

    result = _get_all_links_from_element(
        "http://example.com", 
        elements, 
        include_regex=r'NOMATCH'
    )

    assert len(result) == 0

def test_get_all_links_from_element_empty_elements():
    """Test _get_all_links_from_element with empty elements."""
    result = _get_all_links_from_element("http://example.com", [])
    assert result == []

def test_get_all_links_from_element_no_href():
    """Test _get_all_links_from_element with anchor tags without href."""
    html = '<div><a>No href link</a><a href="/valid">Valid Link</a></div>'
    soup = BeautifulSoup(html, 'lxml')
    elements = soup.find_all('div')

    result = _get_all_links_from_element("http://example.com", elements)

    assert len(result) == 1
    assert result[0].text == "Valid Link"

@patch('utils.bs4_utils.get_soup')
def test_get_all_links_from_div_with_class(mock_get_soup):
    """Test get_all_links_from_div with matching div class."""
    html = '''
    <div class="target-class other-class">
        <a href="/test1">Test Link 1</a>
    </div>
    <div class="other-class">
        <a href="/test2">Test Link 2</a>
    </div>
    '''
    mock_get_soup.return_value = BeautifulSoup(html, 'lxml')

    result = get_all_links_from_div("http://example.com", ["target-class"])

    assert len(result) == 1
    assert result[0].text == "Test Link 1"
    mock_get_soup.assert_called_once_with("http://example.com")

@patch('utils.bs4_utils.get_soup')
def test_get_all_links_from_div_with_title(mock_get_soup):
    """Test get_all_links_from_div with title attribute."""
    html = '''
    <div class="target-class" title="specific-title">
        <a href="/test1">Test Link 1</a>
    </div>
    <div class="target-class" title="other-title">
        <a href="/test2">Test Link 2</a>
    </div>
    '''
    mock_get_soup.return_value = BeautifulSoup(html, 'lxml')

    result = get_all_links_from_div(
        "http://example.com", 
        ["target-class"], 
        div_title="specific-title"
    )

    assert len(result) == 1
    assert result[0].text == "Test Link 1"

@patch('utils.bs4_utils.get_soup')
def test_get_all_links_from_div_no_matching_divs(mock_get_soup):
    """Test get_all_links_from_div when no divs match criteria."""
    html = '<div class="other-class"><a href="/test">Test Link</a></div>'
    mock_get_soup.return_value = BeautifulSoup(html, 'lxml')

    result = get_all_links_from_div("http://example.com", ["target-class"])

    assert result == []

@patch('utils.bs4_utils.get_soup')
def test_get_all_links_from_div_multiple_classes(mock_get_soup):
    """Test get_all_links_from_div with multiple required classes."""
    html = '''
    <div class="class1 class2 class3">
        <a href="/test1">Test Link 1</a>
    </div>
    <div class="class1 class3">
        <a href="/test2">Test Link 2</a>
    </div>
    '''
    mock_get_soup.return_value = BeautifulSoup(html, 'lxml')

    result = get_all_links_from_div("http://example.com", ["class1", "class2"])

    assert len(result) == 1
    assert result[0].text == "Test Link 1"

def test_extract_coursepool_and_required_credits_valid_table():
    """Test extract_coursepool_and_required_credits with valid table."""
    html = '''
    <table>
        <tr>
            <td>3.5</td>
            <td><a href="/pool1">Math Pool</a></td>
        </tr>
        <tr>
            <td>6.0</td>
            <td><a href="/pool2">Physics Pool</a><a href="/pool3">Chemistry Pool</a></td>
        </tr>
    </table>
    '''
    soup = BeautifulSoup(html, 'lxml')
    table = soup.find('table')

    result = extract_coursepool_and_required_credits("http://example.com", table)

    assert len(result) == 3
    assert result[0][0].text == "Math Pool"
    assert (result[0][1] - 3.5) < 1e-8
    assert result[1][0].text == "Physics Pool"
    assert (result[1][1] - 6.0) < 1e-8
    assert result[2][0].text == "Chemistry Pool"
    assert (result[2][1] - 6.0) < 1e-8

def test_extract_coursepool_and_required_credits_duplicates_removed():
    """Test that duplicate course pools are removed while preserving order."""
    html = '''
    <table>
        <tr>
            <td>3.0</td>
            <td><a href="/pool1">Math Pool</a><a href="/pool2">Math Pool</a></td>
        </tr>
        <tr>
            <td>5.0</td>
            <td><a href="/pool3">Science Pool</a></td>
        </tr>
    </table>
    '''
    soup = BeautifulSoup(html, 'lxml')
    table = soup.find('table')

    result = extract_coursepool_and_required_credits("http://example.com", table)

    assert len(result) == 2
    assert result[0][0].text == "Math Pool"
    assert (result[0][1] - 3.0) < 1e-8
    assert result[1][0].text == "Science Pool"
    assert (result[1][1] - 5.0) < 1e-8

@patch('utils.bs4_utils.get_soup')
def test_extract_coursepool_courses_found_directly(mock_get_soup):
    """Test extract_coursepool_courses when courses are found directly."""
    html = '''
    <div class="defined-group" title="Math Courses">
        <a href="/comp248">COMP 248</a>
        <a href="/math204">MATH 204</a>
    </div>
    '''
    mock_get_soup.return_value = BeautifulSoup(html, 'lxml')

    course_pool = CoursePool(_id="math_courses", name="Math Courses", courses=[], credits_required=6.0)
    result = extract_coursepool_courses("http://example.com", course_pool)

    assert result
    assert len(course_pool.courses) == 2
    assert "COMP 248" in course_pool.courses
    assert "MATH 204" in course_pool.courses

@patch('utils.bs4_utils.get_soup')
def test_extract_coursepool_courses_no_div_found(mock_get_soup):
    """Test extract_coursepool_courses when no matching div is found."""
    html = '<div class="other-class" title="Other">Content</div>'
    mock_get_soup.return_value = BeautifulSoup(html, 'lxml')

    course_pool = CoursePool(_id="math_courses", name="Math Courses", courses=[], credits_required=6.0)
    result = extract_coursepool_courses("http://example.com", course_pool)

    assert not result
    assert course_pool.courses == []

@patch('utils.bs4_utils.get_soup')
def test_extract_coursepool_courses_with_sublinks(mock_get_soup):
    """Test extract_coursepool_courses parsing sublinks when no direct courses found."""
    html = '''
    <div class="defined-group" title="Math Courses">
        <a href="/subgroup">Math Subgroup</a>
    </div>
    <div class="defined-group" title="Math Subgroup">
        <a href="/comp248">COMP 248</a>
    </div>
    '''
    mock_get_soup.return_value = BeautifulSoup(html, 'lxml')

    course_pool = CoursePool(_id="math_courses", name="Math Courses", courses=[], credits_required=6.0)
    result = extract_coursepool_courses("http://example.com", course_pool, automatically_parse_sublinks=True)

    assert result
    assert len(course_pool.courses) == 1
    assert "COMP 248" in course_pool.courses

@patch('utils.bs4_utils.get_soup')
def test_extract_coursepool_courses_no_sublinks(mock_get_soup):
    """Test extract_coursepool_courses without sublink parsing."""
    html = '''
    <div class="defined-group" title="Math Courses">
        <a href="/subgroup">Math Subgroup</a>
    </div>
    '''
    mock_get_soup.return_value = BeautifulSoup(html, 'lxml')

    course_pool = CoursePool(_id="math_courses", name="Math Courses", courses=[], credits_required=6.0)
    result = extract_coursepool_courses("http://example.com", course_pool, automatically_parse_sublinks=False)

    assert result
    assert course_pool.courses == []

@patch('utils.bs4_utils.get_soup')
def test_extract_coursepool_courses_duplicates_removed(mock_get_soup):
    """Test that duplicate courses are removed and sorted."""
    html = '''
    <div class="defined-group" title="Math Courses">
        <a href="/math204">MATH 204</a>
        <a href="/comp248">COMP 248</a>
        <a href="/math204">MATH 204</a>
    </div>
    '''
    mock_get_soup.return_value = BeautifulSoup(html, 'lxml')

    course_pool = CoursePool(_id="math_courses", name="Math Courses", courses=[], credits_required=6.0)
    result = extract_coursepool_courses("http://example.com", course_pool)

    assert result
    assert len(course_pool.courses) == 2
    # Check courses are sorted (COMP comes before MATH)
    assert course_pool.courses[0] == "COMP 248"
    assert course_pool.courses[1] == "MATH 204"