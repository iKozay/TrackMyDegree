import unittest
from unittest.mock import patch
import sys
import os

# Add the parent directory to the path to import the modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from utils.bs4_utils import (
    get_list_from_div,
    clean_text,
    parse_title_and_credits,
    split_sections,
    extract_courses
)

class TestBS4Utils(unittest.TestCase):

    @patch('utils.bs4_utils.webu.fetch_html')
    def test_get_list_from_div_with_valid_content(self, mock_fetch_html):
        """Test get_list_from_div with valid HTML content."""
        mock_html = '''
        <div class="test-class">
            <ul>
                <li><a href="/test1">Test Link 1</a> Additional text</li>
                <li>Plain text item</li>
            </ul>
            <ul>
                <li><a href="/test2">Test Link 2</a></li>
            </ul>
        </div>
        '''
        mock_fetch_html.return_value = mock_html
        
        result = get_list_from_div("http://example.com", ["test-class"])
        
        expected = [
            {"text": "Test Link 1 Additional text", "url": "http://example.com/test1"},
            {"text": "Plain text item", "url": None},
            {"text": "Test Link 2", "url": "http://example.com/test2"}
        ]
        
        self.assertEqual(len(result), 3)
        self.assertEqual(result, expected)

    @patch('utils.bs4_utils.webu.fetch_html')
    def test_get_list_from_div_with_multiple_links(self, mock_fetch_html):
        """Test get_list_from_div with multiple links in a single li element."""
        mock_html = '''
        <div class="test-class">
            <ul>
                <li><a href="/eng1">BEng in Aerospace Engineering</a>, <a href="/eng2">BEng in Civil Engineering</a>, and <a href="/eng3">BEng in Software Engineering</a></li>
                <li><a href="/comp1">BCompSc in Computer Science</a></li>
            </ul>
        </div>
        '''
        mock_fetch_html.return_value = mock_html
        
        result = get_list_from_div("http://example.com", ["test-class"])
        
        expected = [
            {"text": "BEng in Aerospace Engineering", "url": "http://example.com/eng1"},
            {"text": "BEng in Civil Engineering", "url": "http://example.com/eng2"},
            {"text": "BEng in Software Engineering", "url": "http://example.com/eng3"},
            {"text": "BCompSc in Computer Science", "url": "http://example.com/comp1"}
        ]
        
        self.assertEqual(len(result), 4)
        self.assertEqual(result, expected)

    @patch('utils.bs4_utils.webu.fetch_html')
    def test_get_list_from_div_with_complex_multiple_links(self, mock_fetch_html):
        """Test get_list_from_div with complex HTML structure containing multiple nested links."""
        mock_html = '''
        <div class="test-class">
            <ul>
                <li><span>BEng degrees including: <span class="tag"><a href="/eng/aero">BEng in Aerospace Engineering</a></span>, <span class="tag"><a href="/eng/civil">BEng in Civil Engineering</a></span>, and <span class="tag"><a href="/eng/software">BEng in Software Engineering</a></span>.</span></li>
                <li><span><span class="tag"><a href="/comp/bcompsc">BCompSc in Computer Science</a></li>
            </ul>
        </div>
        '''
        mock_fetch_html.return_value = mock_html
        
        result = get_list_from_div("http://example.com", ["test-class"])
        
        expected = [
            {"text": "BEng in Aerospace Engineering", "url": "http://example.com/eng/aero"},
            {"text": "BEng in Civil Engineering", "url": "http://example.com/eng/civil"},
            {"text": "BEng in Software Engineering", "url": "http://example.com/eng/software"},
            {"text": "BCompSc in Computer Science", "url": "http://example.com/comp/bcompsc"}
        ]
        
        self.assertEqual(len(result), 4)
        self.assertEqual(result, expected)

    @patch('utils.bs4_utils.webu.fetch_html')
    def test_get_list_from_div_with_empty_div(self, mock_fetch_html):
        """Test get_list_from_div with empty div."""
        mock_html = '<div class="test-class"></div>'
        mock_fetch_html.return_value = mock_html
        
        result = get_list_from_div("http://example.com", ["test-class"])
        
        self.assertEqual(result, [])

    @patch('utils.bs4_utils.webu.fetch_html')
    def test_get_list_from_div_no_matching_divs(self, mock_fetch_html):
        """Test get_list_from_div with no matching divs."""
        mock_html = '<div class="other-class"><ul><li>Test</li></ul></div>'
        mock_fetch_html.return_value = mock_html
        
        result = get_list_from_div("http://example.com", ["test-class"])
        
        self.assertEqual(result, [])

    @patch('utils.bs4_utils.webu.fetch_html')
    def test_get_list_from_div_empty_li(self, mock_fetch_html):
        """Test get_list_from_div with empty li elements."""
        mock_html = '''
        <div class="test-class">
            <ul>
                <li></li>
                <li>   </li>
                <li><a href="/test">Valid Link</a></li>
                <li><a href="/empty"></a></li>
            </ul>
        </div>
        '''
        mock_fetch_html.return_value = mock_html
        
        result = get_list_from_div("http://example.com", ["test-class"])
        
        expected = [
            {"text": "Valid Link", "url": "http://example.com/test"}
        ]
        
        self.assertEqual(result, expected)

    def test_clean_text_basic_functionality(self):
        """Test basic clean_text functionality."""
        text = "  COMP  248   Introduction to Programming  "
        result = clean_text(text)
        expected = "COMP 248 Introduction to Programming"
        self.assertEqual(result, expected)

    def test_clean_text_empty_or_none(self):
        """Test clean_text with empty or None input."""
        self.assertEqual(clean_text(""), "")
        self.assertEqual(clean_text(None), "")
        self.assertEqual(clean_text("   "), "")

    def test_clean_text_special_characters(self):
        """Test clean_text with special characters."""
        text = "Course\u2011Title\u2019s\u2014Description\u00a0Text"
        result = clean_text(text)
        expected = "Course-Title's — Description Text"
        self.assertEqual(result, expected)

    def test_clean_text_punctuation_spacing(self):
        """Test clean_text with punctuation spacing."""
        text = "Prerequisites:Math101,Physics201;Notes:Important."
        result = clean_text(text)
        expected = "Prerequisites: Math 101, Physics 201; Notes: Important."
        self.assertEqual(result, expected)

    def test_clean_text_number_letter_spacing(self):
        """Test clean_text with number and letter spacing."""
        text = "COMP248Programming3credits"
        result = clean_text(text)
        expected = "COMP 248 Programming 3 credits"
        self.assertEqual(result, expected)

    def test_parse_title_and_credits_valid_4_letter_code(self):
        """Test parse_title_and_credits with 4-letter course code."""
        title = "COMP 248 Introduction to Programming (3 credits)"
        course_id, title_parsed, course_credits = parse_title_and_credits(title)
        
        self.assertEqual(course_id, "COMP 248")
        self.assertEqual(title_parsed, "Introduction to Programming")
        self.assertEqual(course_credits, 3)

    def test_parse_title_and_credits_valid_3_letter_code(self):
        """Test parse_title_and_credits with 3-letter course code."""
        title = "ENG 101 English Composition (3.5 credits)"
        course_id, title_parsed, course_credits = parse_title_and_credits(title)
        
        self.assertEqual(course_id, "ENG 101")
        self.assertEqual(title_parsed, "English Composition")
        self.assertEqual(course_credits, 3.5)

    def test_parse_title_and_credits_invalid_format(self):
        """Test parse_title_and_credits with invalid format."""
        title = "Invalid Title Format"
        course_id, title_parsed, course_credits = parse_title_and_credits(title)
        
        self.assertIsNone(course_id)
        self.assertEqual(title_parsed, "Invalid Title Format")
        self.assertIsNone(course_credits)

    def test_parse_title_and_credits_decimal_credits(self):
        """Test parse_title_and_credits with decimal credits."""
        title = "MATH 205 Differential Equations (4.5 credits)"
        course_id, title_parsed, course_credits = parse_title_and_credits(title)
        
        self.assertEqual(course_id, "MATH 205")
        self.assertEqual(title_parsed, "Differential Equations")
        self.assertEqual(course_credits, 4.5)

    def test_split_sections_all_sections(self):
        """Test split_sections with all section markers present."""
        text = ("Prerequisite/Corequisite: MATH 201 Description: This is a course about calculus. "
                "Component(s): Lecture 3 hours, Tutorial 1 hour Notes: Important course.")
        
        result = split_sections(text)
        
        expected = {
            "Prerequisite/Corequisite:": "MATH 201",
            "Description:": "This is a course about calculus.",
            "Component(s):": "Lecture 3 hours, Tutorial 1 hour",
            "Notes:": "Important course."
        }
        
        self.assertEqual(result, expected)

    def test_split_sections_partial_sections(self):
        """Test split_sections with only some sections present."""
        text = "Description: Course description here. Notes: Some notes."
        
        result = split_sections(text)
        
        expected = {
            "Prerequisite/Corequisite:": "",
            "Description:": "Course description here.",
            "Component(s):": "",
            "Notes:": "Some notes."
        }
        
        self.assertEqual(result, expected)

    def test_split_sections_no_sections(self):
        """Test split_sections with no section markers."""
        text = "Just some random text without markers."
        
        result = split_sections(text)
        
        expected = {
            "Prerequisite/Corequisite:": "",
            "Description:": "",
            "Component(s):": "",
            "Notes:": ""
        }
        
        self.assertEqual(result, expected)

    def test_split_sections_empty_text(self):
        """Test split_sections with empty text."""
        result = split_sections("")
        
        expected = {
            "Prerequisite/Corequisite:": "",
            "Description:": "",
            "Component(s):": "",
            "Notes:": ""
        }
        
        self.assertEqual(result, expected)

    @patch('utils.bs4_utils.webu.fetch_html')
    def test_extract_courses_valid_html(self, mock_fetch_html):
        """Test extract_courses with valid HTML content."""
        mock_html = '''
        <div class="ccms-course-tree">
        <div class="course" title="comp-248">
            <a name="3535" id="3535"></a>
            <div class="c-accordion">
                <div class="accordion">
                    <div class="accordion-item border-dark">
                    <h3 class="accordion-header xlarge">
                        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#node-3535" aria-expanded="true" aria-controls="node-3535">
                            <div class="title">COMP 248 Object-Oriented Programming I (3.5 credits)</div>
                        </button>
                    </h3>
                    <div id="node-3535" class="accordion-collapse collapse show" aria-labelledby="node-3535" style="">
                        <div class="accordion-body text-xlarge">
                            <p></p>
                            <h4>Prerequisite/Corequisite:</h4>
                            <span class="requisites"> The following courses must be completed previously or concurrently: <span class="tagWrapper"> <span class="tag" data-segmenttype="Tagv2" data-uid="3a9b3c1a-1530-432e-9812-5473a4489b33"><span data-nodeid="2592"><a href="/academics/undergraduate/calendar/current/section-31-faculty-of-arts-and-science/section-31-200-department-of-mathematics-and-statistics/mathematics-and-statistics-courses.html#2592">MATH 204</a></span> </span></span> or Cegep Mathematics 105 or NYC.</span>
                            <p></p>
                            <p class="crse-descr"></p>
                            <h4>Description:</h4>
                            Introduction to programming. Basic data types, variables, expressions, assignments, control flow. Classes, objects, methods. Information hiding, public vs. private visibility, data abstraction and encapsulation. References. Arrays.
                            <p></p>
                            <p></p>
                            <h4>Component(s):</h4>
                            <span class="components"> Lecture 3 hours per week; Tutorial 2 hours per week; Laboratory 1 hour per week</span>
                            <p></p>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
        </div>
        '''
        mock_fetch_html.return_value = mock_html
        
        result = extract_courses("COMP", "http://example.com")
        
        self.assertEqual(len(result), 1)  # Only COMP course should match
        course = result[0]
        self.assertEqual(course._id, "COMP 248")
        self.assertEqual(course.title, "Object-Oriented Programming I")
        self.assertEqual(course.credits, 3.5)
        self.assertEqual(course.description, "Introduction to programming. Basic data types, variables, expressions, assignments, control flow. Classes, objects, methods. Information hiding, public vs. private visibility, data abstraction and encapsulation. References. Arrays.")
        self.assertEqual(course.prereq_coreq_text, "The following courses must be completed previously or concurrently: MATH 204 or Cegep Mathematics 105 or NYC.")

    @patch('utils.bs4_utils.webu.fetch_html')
    def test_extract_courses_no_course_tree(self, mock_fetch_html):
        """Test extract_courses with HTML missing course tree."""
        mock_html = '<div>No course tree here</div>'
        mock_fetch_html.return_value = mock_html
        
        result = extract_courses("COMP", "http://example.com")
        
        self.assertEqual(result, [])

    @patch('utils.bs4_utils.webu.fetch_html')
    def test_extract_courses_no_matching_courses(self, mock_fetch_html):
        """Test extract_courses with no courses matching the catalog."""
        mock_html = '''
        <div class="ccms-course-tree">
            <div class="course">
                <h3 class="accordion-header xlarge">MATH 205 Differential Equations (4 credits)</h3>
                <div class="accordion-body">Description: Math course.</div>
            </div>
        </div>
        '''
        mock_fetch_html.return_value = mock_html
        
        result = extract_courses("COMP", "http://example.com")
        
        self.assertEqual(result, [])

    @patch('utils.bs4_utils.webu.fetch_html')
    def test_extract_courses_invalid_title_format(self, mock_fetch_html):
        """Test extract_courses with invalid title format."""
        mock_html = '''
        <div class="ccms-course-tree">
            <div class="course">
                <h3 class="accordion-header xlarge">Invalid Title Format</h3>
                <div class="accordion-body">Description: Some course.</div>
            </div>
        </div>
        '''
        mock_fetch_html.return_value = mock_html
        
        result = extract_courses("COMP", "http://example.com")
        
        self.assertEqual(result, [])

    @patch('utils.bs4_utils.webu.fetch_html')
    def test_extract_courses_no_accordion_body(self, mock_fetch_html):
        """Test extract_courses with missing accordion body."""
        mock_html = '''
        <div class="ccms-course-tree">
            <div class="course">
                <h3 class="accordion-header xlarge">COMP 248 Introduction to Programming (3 credits)</h3>
            </div>
        </div>
        '''
        mock_fetch_html.return_value = mock_html
        
        result = extract_courses("COMP", "http://example.com")
        
        self.assertEqual(len(result), 1)
        course = result[0]
        self.assertEqual(course._id, "COMP 248")
        self.assertEqual(course.description, "")
        self.assertEqual(course.prereq_coreq_text, "")

    @patch('utils.bs4_utils.webu.fetch_html')
    def test_extract_courses_no_title_element(self, mock_fetch_html):
        """Test extract_courses with missing title element."""
        mock_html = '''
        <div class="ccms-course-tree">
            <div class="course">
                <div class="accordion-body">Description: Some course.</div>
            </div>
        </div>
        '''
        mock_fetch_html.return_value = mock_html
        
        result = extract_courses("COMP", "http://example.com")
        
        self.assertEqual(result, [])