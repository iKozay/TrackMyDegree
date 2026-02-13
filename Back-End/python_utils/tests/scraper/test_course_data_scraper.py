from unittest.mock import patch, MagicMock, mock_open
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scraper.course_data_scraper import CourseDataScraper
from models import Course, AnchorLink


class TestCourseDataScraper:

    @patch('scraper.course_data_scraper.os.path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_load_cache_from_file_exists(self, mock_file, mock_exists):
        """Test loading cache when file exists"""
        mock_exists.return_value = True
        mock_file.return_value.read.return_value = json.dumps({
            "COMP 248": {
                "_id": "COMP 248",
                "title": "Object-Oriented Programming I",
                "credits": 3.5,
                "description": "Programming course",
                "offered_in": ["Fall", "Winter"],
                "prereqCoreqText": "",
                "rules": {"prereq": [], "coreq": [], "not_taken": []},
                "notes": "",
                "components": []
            }
        })
        
        scraper = CourseDataScraper(cache_dir="test_cache")
        scraper.load_cache_from_file()
        
        assert "COMP 248" in scraper.all_courses
        assert scraper.all_courses["COMP 248"].title == "Object-Oriented Programming I"

    @patch('scraper.course_data_scraper.os.path.exists')
    @patch.object(CourseDataScraper, 'scrape_all_courses')
    @patch.object(CourseDataScraper, '_save_cache_to_file')
    def test_load_cache_from_file_not_exists(self, mock_save, mock_scrape, mock_exists):
        """Test behavior when cache file doesn't exist"""
        mock_exists.return_value = False
        
        scraper = CourseDataScraper(cache_dir="test_cache")
        scraper.load_cache_from_file()
        
        mock_scrape.assert_called_once()
        mock_save.assert_called_once()

    def test_get_all_courses_empty(self):
        """Test get_all_courses when no courses loaded"""
        scraper = CourseDataScraper(cache_dir="test_cache")
        # Clear all_courses to ensure empty state
        scraper.all_courses = {}
        
        with patch.object(CourseDataScraper, '_scrape_if_needed') as mock_scrape:
            result = scraper.get_all_courses()
            mock_scrape.assert_called_once()
            assert result == []

    @patch.object(CourseDataScraper, '__init__', lambda self, cache_dir: setattr(self, 'all_courses', {}) or setattr(self, 'cache_dir', cache_dir))
    def test_get_all_courses_with_data(self):
        """Test get_all_courses with existing data"""
        scraper = CourseDataScraper(cache_dir="test_cache")
        test_course = Course(
            _id="COMP 248", 
            title="Test Course", 
            credits=3.0, 
            description="Test", 
            offered_in=["Fall"], 
            prereqCoreqText="", 
            rules={"prereq": [], "coreq": [], "not_taken": []}, 
            notes="", 
            components=[]
        )
        scraper.all_courses["COMP 248"] = test_course
        
        # Test returning IDs only
        result = scraper.get_all_courses(return_full_object=False)
        assert result == ["COMP 248"]
        
        # Test returning full objects
        result = scraper.get_all_courses(return_full_object=True)
        assert len(result) == 1
        assert result[0]._id == "COMP 248"

    @patch.object(CourseDataScraper, '__init__', lambda self, cache_dir: setattr(self, 'all_courses', {}) or setattr(self, 'cache_dir', cache_dir))
    def test_get_courses_by_subjects(self):
        """Test filtering courses by subject"""
        scraper = CourseDataScraper(cache_dir="test_cache")
        comp_course = Course(_id="COMP 248", title="Programming", credits=3.0, description="", offered_in=[], prereqCoreqText="", rules={"prereq": [], "coreq": [], "not_taken": []}, notes="", components=[])
        math_course = Course(_id="MATH 205", title="Calculus", credits=4.0, description="", offered_in=[], prereqCoreqText="", rules={"prereq": [], "coreq": [], "not_taken": []}, notes="", components=[]) 
        
        scraper.all_courses["COMP 248"] = comp_course
        scraper.all_courses["MATH 205"] = math_course
        
        # Test inclusive filtering
        result = scraper.get_courses_by_subjects(["COMP"], inclusive=True, return_full_object=False)
        assert result == ["COMP 248"]
        
        # Test exclusive filtering
        result = scraper.get_courses_by_subjects(["COMP"], inclusive=False, return_full_object=False)
        assert result == ["MATH 205"]

    @patch.object(CourseDataScraper, '__init__', lambda self, cache_dir: setattr(self, 'all_courses', {}) or setattr(self, 'cache_dir', cache_dir))
    def test_get_courses_by_ids(self):
        """Test filtering courses by specific IDs"""
        scraper = CourseDataScraper(cache_dir="test_cache")
        test_course = Course(_id="COMP 248", title="Test", credits=3.0, description="", offered_in=[], prereqCoreqText="", rules={"prereq": [], "coreq": [], "not_taken": []}, notes="", components=[])
        scraper.all_courses["COMP 248"] = test_course
        
        result = scraper.get_courses_by_ids(["COMP 248"], return_full_object=True)
        assert len(result) == 1
        assert result[0]._id == "COMP 248"
        
        # Test with non-existent ID
        result = scraper.get_courses_by_ids(["NONEXISTENT"], return_full_object=False)
        assert result == []

    @patch('scraper.course_data_scraper.get_all_links_from_div')
    def test_scrape_faculty_links(self, mock_get_links):
        """Test scraping faculty links from main page"""
        mock_get_links.return_value = [
            AnchorLink(text="Faculty of Arts and Science Courses", url="http://test1.com"),
            AnchorLink(text="Some Other Faculty", url="http://test2.com"),
            AnchorLink(text="Gina Cody School of Engineering and Computer Science Courses", url="http://test3.com")
        ]
        
        scraper = CourseDataScraper(cache_dir="test_cache")
        result = scraper._scrape_faculty_links()
        
        assert len(result) == 2
        assert any(link.text == "Faculty of Arts and Science Courses" for link in result)
        assert any(link.text == "Gina Cody School of Engineering and Computer Science Courses" for link in result)

    @patch('builtins.open', new_callable=mock_open, read_data="Subject,Catalog Nbr,Term Code\nCOMP,248,2244\nCOMP,248,2251\n")
    @patch('scraper.course_data_scraper.get_soup')
    @patch('scraper.course_data_scraper.get_concordia_api_instance')
    def test_parse_course_objects(self, mock_get_instance, mock_get_soup, mock_file):
        """Test parsing course objects from HTML"""
        # Mock the HTML structure
        mock_soup = MagicMock()
        mock_course_div = MagicMock()
        
        # Mock title element
        mock_title = MagicMock()
        mock_title.stripped_strings = ["COMP 248 Object-Oriented Programming I (3.5 credits)"]
        mock_course_div.find.return_value = mock_title
        
        # Mock content div  
        mock_content = MagicMock()
        mock_content.stripped_strings = ["Description: Introduction to programming. Notes: Important course."]
        mock_course_div.find.side_effect = lambda tag, class_=None: mock_title if class_ == 'accordion-header xlarge' else mock_content
        
        mock_soup.find_all.return_value = [MagicMock()]
        mock_soup.find_all.return_value[0].find_all.return_value = [mock_course_div]
        mock_get_soup.return_value = mock_soup
        
        # Mock API instance
        mock_api = MagicMock()
        mock_api.get_term.return_value = ["Fall", "Winter"]
        mock_get_instance.return_value = mock_api
        
        scraper = CourseDataScraper(cache_dir="test_cache")
        result = scraper._parse_course_objects("http://test.com")
        
        assert len(result) == 1
        assert isinstance(result[0], Course)

    def test_add_extra_cwt_courses(self):
        """Test addition of extra CWT courses"""
        scraper = CourseDataScraper(cache_dir="test_cache") 
        scraper._add_extra_cwt_courses()
        
        expected_cwt_courses = ["CWT 100", "CWT 200", "CWT 300", "CWT 400"]
        for course_id in expected_cwt_courses:
            assert course_id in scraper.all_courses
            assert scraper.all_courses[course_id].title.startswith("Co-op Work Term")
            assert abs(scraper.all_courses[course_id].credits - 0.0) < 1e-8

    @patch('builtins.open', new_callable=mock_open)
    @patch('json.dump')
    def test_save_cache_to_file(self, mock_json_dump, mock_file):
        """Test saving cache to file"""
        scraper = CourseDataScraper(cache_dir="test_cache")
        test_course = Course(
            _id="COMP 248", title="Test Course", credits=3.5, description="Test",
            offered_in=["Fall"], prereqCoreqText="", rules={"prereq": [], "coreq": [], "not_taken": []},
            notes="", components=[]
        )
        scraper.all_courses["COMP 248"] = test_course
        
        scraper._save_cache_to_file()
        
        mock_file.assert_called_once_with(scraper.local_cache_file, "w")
        mock_json_dump.assert_called_once()

    @patch.object(CourseDataScraper, '_add_extra_cwt_courses')
    @patch.object(CourseDataScraper, '_extract_courses_from_subjects')
    @patch.object(CourseDataScraper, '_scrape_faculty_links')
    def test_scrape_all_courses(self, mock_scrape_faculty, mock_extract_courses, mock_add_cwt):
        """Test scraping all courses orchestration"""
        mock_faculty_links = [
            AnchorLink(text="Faculty of Arts and Science Courses", url="http://test1.com"),
            AnchorLink(text="Gina Cody School of Engineering and Computer Science Courses", url="http://test2.com")
        ]
        mock_scrape_faculty.return_value = mock_faculty_links
        
        mock_courses = [
            Course(_id="COMP 248", title="Programming", credits=3.5, description="Test",
                  offered_in=["Fall"], prereqCoreqText="", rules={"prereq": [], "coreq": [], "not_taken": []},
                  notes="", components=[])
        ]
        mock_extract_courses.return_value = mock_courses
        
        with patch('scraper.course_data_scraper.get_all_links_from_div') as mock_get_links:
            mock_get_links.return_value = [AnchorLink(text="COMP", url="http://comp.com")]
            
            scraper = CourseDataScraper(cache_dir="test_cache")
            scraper.scrape_all_courses()
            
            mock_scrape_faculty.assert_called_once()
            mock_extract_courses.assert_called()
            mock_add_cwt.assert_called_once()
            assert "COMP 248" in scraper.all_courses

    @patch.object(CourseDataScraper, '_parse_course_objects')
    def test_extract_courses_from_subjects(self, mock_parse_objects):
        """Test extracting courses from subject links"""
        mock_courses = [
            Course(_id="COMP 248", title="Programming", credits=3.5, description="Test",
                  offered_in=["Fall"], prereqCoreqText="", rules={"prereq": [], "coreq": [], "not_taken": []},
                  notes="", components=[]),
            Course(_id="COMP 249", title="Programming II", credits=3.5, description="Test",
                  offered_in=["Winter"], prereqCoreqText="", rules={"prereq": [], "coreq": [], "not_taken": []},
                  notes="", components=[])
        ]
        mock_parse_objects.return_value = mock_courses
        
        subject_links = [
            AnchorLink(text="COMP", url="http://comp.com"),
            AnchorLink(text="MATH", url="http://math.com")
        ]
        
        scraper = CourseDataScraper(cache_dir="test_cache")
        result = scraper._extract_courses_from_subjects(subject_links)
        
        assert len(result) == 4  # 2 courses × 2 subjects
        assert mock_parse_objects.call_count == 2
        mock_parse_objects.assert_any_call("http://comp.com")
        mock_parse_objects.assert_any_call("http://math.com")
