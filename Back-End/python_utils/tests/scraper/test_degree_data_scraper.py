import pytest
from unittest.mock import patch, MagicMock
import sys
import os
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scraper.degree_data_scraper import *
from scraper.abstract_degree_scraper import AbstractDegreeScraper
from models import AnchorLink, CoursePool, DegreeType


class MockDegreeScraper(AbstractDegreeScraper):
    """Mock scraper for testing"""
    def _get_program_requirements(self):
        # Mock implementation
        pass
    
    def _handle_special_cases(self):
        # Mock implementation  
        pass

class TestDegreeDataScraper:
    """Test DegreeDataScraper orchestration class"""

    @patch('scraper.degree_data_scraper.get_all_links_from_div')
    def test_init_scrapers(self, mock_get_links):
        """Test initialization of degree scrapers from configuration"""
        mock_get_links.return_value = [
            AnchorLink(text="BEng in Computer Engineering", url="http://test.com")
        ]
        
        scraper = DegreeDataScraper()
        assert len(scraper.degree_scrapers) > 0

    @patch('scraper.degree_data_scraper.get_all_links_from_div')
    def test_get_degree_names(self, mock_get_links):
        """Test getting list of available degree names"""
        mock_get_links.return_value = [
            AnchorLink(text="BEng in Computer Engineering", url="http://test.com")
        ]
        
        scraper = DegreeDataScraper()
        names = scraper.get_degree_names()
        assert isinstance(names, list)

    @patch('scraper.degree_data_scraper.get_all_links_from_div')
    def test_scrape_degree_by_name_success(self, mock_get_links):
        """Test scraping a degree by name successfully"""
        mock_get_links.return_value = [
            AnchorLink(text="BEng in Computer Engineering", url="http://test.com")
        ]
        
        scraper = DegreeDataScraper()
        degree_name = "BEng in Computer Engineering"
        
        # Mock the scraper's scrape_degree method
        mock_degree = type('Degree', (), {'name': degree_name, 'totalCredits': 120.0, 'degreeType': DegreeType.STANDALONE})()
        mock_response = ProgramRequirements(degree=mock_degree, coursePools=[])
        
        with patch.object(scraper.degree_scrapers[degree_name], 'scrape_degree', return_value=mock_response):
            result = scraper.scrape_degree_by_name(degree_name)
            assert isinstance(result, ProgramRequirements)

    @patch('scraper.degree_data_scraper.get_all_links_from_div')
    def test_scrape_degree_by_name_not_found(self, mock_get_links):
        """Test scraping non-existent degree raises error"""
        mock_get_links.return_value = []
        scraper = DegreeDataScraper()
        
        with pytest.raises(ValueError, match="Degree scraper for 'NonExistent' not found"):
            scraper.scrape_degree_by_name("NonExistent")

    @patch('scraper.degree_data_scraper.get_all_links_from_div')
    def test_scrape_all_degrees(self, mock_get_links):
        """Test scraping all available degrees"""
        mock_get_links.return_value = [
            AnchorLink(text="BEng in Computer Engineering", url="http://test.com")
        ]
        
        scraper = DegreeDataScraper()
        
        # Mock all scraper instances
        for degree_name, degree_scraper in scraper.degree_scrapers.items():
            mock_degree = type('Degree', (), {'name': degree_name, 'totalCredits': 120.0, 'degreeType': DegreeType.STANDALONE})()
            mock_response = ProgramRequirements(degree=mock_degree, coursePools=[])
            degree_scraper.scrape_degree = MagicMock(return_value=mock_response)
        
        results = scraper.scrape_all_degrees()
        assert isinstance(results, list)
        assert len(results) == len(scraper.degree_scrapers)


class TestAbstractDegreeScraper:
    """Test AbstractDegreeScraper base functionality"""

    def test_scraper_initialization(self):
        """Test abstract scraper initialization"""
        scraper = MockDegreeScraper("Test Degree", "TEST", "http://test.com")
        
        assert scraper.degree_name == "Test Degree"
        assert scraper.degree_short_name == "TEST"
        assert scraper.requirements_url == "http://test.com"
        assert scraper.program_requirements is None

    def test_set_program_requirements(self):
        """Test setting program requirements"""
        scraper = MockDegreeScraper("Test Degree", "TEST", "http://test.com")
        
        test_pool = CoursePool(_id="test", name="Test Pool", creditsRequired=30, courses=["COMP 248"])
        scraper._set_program_requirements("Test Program", 120.0, DegreeType.STANDALONE, [test_pool])
        
        assert scraper.program_requirements is not None
        assert scraper.program_requirements.degree.name == "Test Program"

    def test_add_courses_to_pool(self):
        """Test adding courses to a course pool"""
        scraper = MockDegreeScraper("Test Degree", "TEST", "http://test.com")
        
        test_pool = CoursePool(_id="test", name="Test Pool", creditsRequired=30, courses=["COMP 248"])
        scraper._set_program_requirements("Test Program", 120.0, DegreeType.STANDALONE, [test_pool])
        
        scraper.add_courses_to_pool("Test Pool", ["COMP 249"])
        
        updated_pool = scraper.program_requirements.coursePools[0]
        assert "COMP 249" in updated_pool.courses

    def test_remove_courses_from_pool(self):
        """Test removing courses from a course pool"""
        scraper = MockDegreeScraper("Test Degree", "TEST", "http://test.com")
        
        test_pool = CoursePool(_id="test", name="Test Pool", creditsRequired=30, courses=["COMP 248", "COMP 249"])
        scraper._set_program_requirements("Test Program", 120.0, DegreeType.STANDALONE, [test_pool])
        
        scraper.remove_courses_from_pool("Test Pool", ["COMP 249"])
        
        updated_pool = scraper.program_requirements.coursePools[0]
        assert "COMP 249" not in updated_pool.courses

    def test_scrape_degree_calls_required_methods(self):
        """Test that scrape_degree calls required abstract methods"""
        scraper = MockDegreeScraper("Test Degree", "TEST", "http://test.com")
        
        with patch.object(scraper, '_get_program_requirements') as mock_get_reqs, \
             patch.object(scraper, '_handle_special_cases') as mock_handle_cases:
            
            test_pool = CoursePool(_id="test", name="Test Pool", creditsRequired=30, courses=[])
            scraper._set_program_requirements("Test Program", 120.0, DegreeType.STANDALONE, [test_pool])
            
            result = scraper.scrape_degree()
            
            mock_get_reqs.assert_called_once()
            mock_handle_cases.assert_called_once()
            assert isinstance(result, ProgramRequirements)

class TestGinaCodyDegreeScraper:
    """Test Gina Cody School of Engineering and Computer Science scraper"""

    @patch('scraper.degree_data_scraper.get_soup')
    @patch('scraper.degree_data_scraper.extract_name_and_credits')
    @patch('scraper.degree_data_scraper.extract_coursepool_courses')
    def test_get_program_requirements(self, mock_extract_courses, mock_extract_name, mock_get_soup):
        """Test getting program requirements"""
        # Setup mocks
        mock_soup = MagicMock()
        mock_get_soup.return_value = mock_soup
        
        mock_program_node = MagicMock()
        mock_soup.find.return_value = mock_program_node
        
        mock_h3 = MagicMock()
        mock_program_node.find.return_value = mock_h3
        
        mock_extract_name.return_value = ("Test Program", 120.0)
        mock_extract_courses.return_value = True
        
        # Mock table and coursepool extraction
        mock_table = MagicMock()
        mock_program_node.find.side_effect = [mock_h3, mock_table]
        
        with patch('scraper.degree_data_scraper.extract_coursepool_and_required_credits') as mock_extract_pools:
            mock_extract_pools.return_value = []
            
            scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", "http://test.com")
            scraper._get_program_requirements()
            
            assert scraper.program_requirements is not None
            assert scraper.program_requirements.degree.name == "BEng in Computer Engineering"

    def test_get_program_node_success(self):
        """Test successfully finding program node"""
        soup = BeautifulSoup('<div class="program-node" title="BEng in Computer Engineering"></div>', 'html.parser')
        
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", "http://test.com")
        result = scraper._get_program_node(soup)
        
        assert result is not None
        assert result.get('title') == "BEng in Computer Engineering"

    def test_get_program_node_not_found(self):
        """Test when program node is not found"""
        soup = BeautifulSoup('<div>No matching content</div>', 'html.parser')
        
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", "http://test.com")
        
        with pytest.raises(ValueError, match="Program node for 'BEng in Computer Engineering' not found"):
            scraper._get_program_node(soup)

    @patch('scraper.degree_data_scraper.extract_coursepool_and_required_credits')
    def test_get_course_pools_without_courses(self, mock_extract_pools):
        """Test extracting course pools without courses"""
        mock_extract_pools.return_value = [
            (AnchorLink(text="Computer Engineering Core", url="http://test.com"), 45.0),
            (AnchorLink(text="Engineering Core", url="http://test.com"), 30.0)
        ]
        
        mock_program_node = MagicMock()
        mock_table = MagicMock()
        mock_program_node.find.return_value = mock_table
        
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", "http://test.com")
        result = scraper._get_course_pools_without_courses(mock_program_node)
        
        assert len(result) == 2
        assert all(isinstance(pool, CoursePool) for pool in result)
        assert result[0].name == "Computer Engineering Core"
        assert result[0]._id == "COEN_Computer Engineering Core"
        assert (result[0].creditsRequired - 45.0) < 1e-8

    @patch('scraper.degree_data_scraper.extract_coursepool_courses')
    def test_extract_course_pool_courses(self, mock_extract_courses):
        """Test extracting courses for course pools"""
        # Setup test pools
        pool1 = CoursePool(_id="test1", name="Test Pool 1", creditsRequired=30, courses=[])
        pool2 = CoursePool(_id="test2", name="Test Pool 2", creditsRequired=30, courses=["COMP 248"])
        pool3 = CoursePool(_id="test3", name="Test Pool 3", creditsRequired=30, courses=[])
        
        # Mock extract_coursepool_courses to succeed for pool2, fail for pool1 and pool3
        def mock_extract_side_effect(url, pool):
            if pool.name == "Test Pool 2":
                return True
            else:
                return False
        
        mock_extract_courses.side_effect = mock_extract_side_effect
        
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", "http://test.com")
        failed_pools = scraper._extract_course_pool_courses([pool1, pool2, pool3])
        
        # pool1 and pool3 should fail (no success or no courses)
        assert len(failed_pools) == 2
        assert pool1 in failed_pools
        assert pool2 not in failed_pools
        assert pool3 in failed_pools

    @patch('scraper.degree_data_scraper.GinaCodyDegreeScraper._handle_engineering_core')
    def test_handle_failed_course_pools_with_engineering_core(self, mock_handle_engineering):
        """Test handling failed course pools with engineering core"""
        pool1 = CoursePool(_id="test1", name="Engineering Core", creditsRequired=30, courses=[])
        pool2 = CoursePool(_id="test2", name="Other Pool", creditsRequired=30, courses=[])
        
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [])
        
        with patch.object(scraper, 'logger') as mock_logger:
            scraper._handle_failed_course_pools([pool1, pool2])
            mock_handle_engineering.assert_called_once_with(pool1)
            mock_logger.warning.assert_called_once()

    def test_handle_failed_course_pools_without_special_handling(self):
        """Test handling failed course pools without special handling"""
        pool = CoursePool(_id="test", name="Random Pool", creditsRequired=30, courses=[])
        
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [])
        
        with patch.object(scraper, 'logger') as mock_logger:
            scraper._handle_failed_course_pools([pool])
            mock_logger.warning.assert_called_once_with("Warning: No special handling defined for failed course pool 'Random Pool' in 'Test' degree")

    @patch('scraper.degree_data_scraper.get_all_links_from_div')
    @patch('scraper.degree_data_scraper.GinaCodyDegreeScraper._get_general_education_pool')
    def test_handle_engineering_core(self, mock_get_gen_ed, mock_get_links):
        """Test handling engineering core courses"""
        # Setup mocks
        mock_get_links.return_value = [
            AnchorLink(text="ENGR 201", url="http://test1.com"),
            AnchorLink(text="ENGR 202", url="http://test2.com")
        ]
        
        mock_gen_ed_pool = CoursePool(_id="gen_ed", name="General Education", creditsRequired=3, courses=[])
        mock_get_gen_ed.return_value = mock_gen_ed_pool
        
        # Setup scraper with program requirements
        pool = CoursePool(_id="eng_core", name="Engineering Core", creditsRequired=33, courses=[])
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [pool])
        
        scraper._handle_engineering_core(pool)
        
        # Check that courses were added
        assert "ENGR 201" in pool.courses
        assert "ENGR 202" in pool.courses
        assert pool.creditsRequired == 30  # 33 - 3
        
        # Check that general education pool was added
        assert len(scraper.program_requirements.coursePools) == 2
        assert mock_gen_ed_pool in scraper.program_requirements.coursePools

    @patch('scraper.degree_data_scraper.get_course_scraper_instance')
    def test_get_general_education_pool(self, mock_get_course_scraper):
        """Test generating general education pool"""
        # Setup mock instance
        mock_instance = MagicMock()
        mock_instance.get_courses_by_subjects.return_value = [
            "ANTH 200", "HIST 201", "PHIL 214", "ANTH 315", "SOCI 212"
        ]
        mock_get_course_scraper.return_value = mock_instance
        
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", "http://test.com")
        result = scraper._get_general_education_pool(6.0)
        
        assert isinstance(result, CoursePool)
        assert result._id == "General Education Humanities and Social Sciences Electives"
        assert result.name == "General Education Humanities and Social Sciences Electives"
        assert (result.creditsRequired - 6.0) < 1e-8
        
        # Check excluded courses were removed
        assert "PHIL 214" not in result.courses
        assert "ANTH 315" not in result.courses
        assert "SOCI 212" not in result.courses
        
        # Check allowed courses remain
        assert "ANTH 200" in result.courses
        assert "HIST 201" in result.courses
        
        # Check other allowed courses were added
        assert "COMS 360" in result.courses
        assert "EDUC 230" in result.courses

class TestAeroDegreeScraper:
    """Test AeroDegreeScraper class"""

    def test_init(self):
        """Test AeroDegreeScraper initialization and degree name splitting"""
        scraper = AeroDegreeScraper("BEng in Aerospace Engineering - Option A", "AERO", "http://test.com")
        
        assert scraper.degree_name == "BEng in Aerospace Engineering - Option A"
        assert scraper.degree_short_name == "AERO"
        assert scraper.requirements_url == "http://test.com"
        assert scraper.degree_name_without_option == "BEng in Aerospace Engineering"
        assert scraper.option_name == "Option A"

    def test_get_program_node_success(self):
        """Test successfully finding program node using degree_name_without_option"""
        soup = BeautifulSoup('<div class="program-node" title="BEng in Aerospace Engineering"></div>', 'html.parser')
        
        scraper = AeroDegreeScraper("BEng in Aerospace Engineering - Option A", "AERO", "http://test.com")
        result = scraper._get_program_node(soup)
        
        assert result is not None
        assert result.get('title') == "BEng in Aerospace Engineering"

    def test_get_program_node_not_found(self):
        """Test when program node is not found"""
        soup = BeautifulSoup('<div>No matching content</div>', 'html.parser')
        
        scraper = AeroDegreeScraper("BEng in Aerospace Engineering - Option A", "AERO", "http://test.com")
        
        with pytest.raises(ValueError, match="Program node for 'BEng in Aerospace Engineering - Option A' not found"):
            scraper._get_program_node(soup)

    @patch('scraper.degree_data_scraper.get_soup')
    @patch('scraper.degree_data_scraper.extract_coursepool_and_required_credits')
    def test_get_course_pools_without_courses(self, mock_extract_pools, mock_get_soup):
        """Test extracting course pools with option handling"""
        # Setup base course pools
        base_pools = [
            (AnchorLink(text="Core Courses", url="http://test.com"), 60.0),
            (AnchorLink(text="Option A", url="http://test.com"), 54.75),
            (AnchorLink(text="Option B", url="http://test.com"), 54.75)
        ]
        
        # Setup option-specific pools
        option_pools = [
            (AnchorLink(text="Aerodynamics", url="http://test.com"), 30.0),
            (AnchorLink(text="Propulsion", url="http://test.com"), 24.75)
        ]
        
        # Mock extract_coursepool_and_required_credits calls
        mock_extract_pools.side_effect = [base_pools, option_pools]
        
        # Mock the soup for finding option divs
        mock_soup_obj = MagicMock()
        mock_get_soup.return_value = mock_soup_obj
        
        # Create option div mock
        option_div = MagicMock()
        h3_element = MagicMock()
        h3_element.string = "Option A — Aerodynamics and Propulsion (54.75 credits)"
        option_div.find.side_effect = [h3_element, MagicMock()]  # h3 then table
        
        mock_soup_obj.find_all.return_value = [option_div]
        
        # Setup program node
        mock_program_node = MagicMock()
        mock_table = MagicMock()
        mock_program_node.find.return_value = mock_table
        
        scraper = AeroDegreeScraper("BEng in Aerospace Engineering - Option A", "AERO", "http://test.com")
        result = scraper._get_course_pools_without_courses(mock_program_node)
        
        # Should have core courses + option courses (no option pools)
        assert len(result) == 3  # Core + 2 option courses
        assert any(pool.name == "Core Courses" for pool in result)
        assert any(pool.name == "Aerodynamics" for pool in result)
        assert any(pool.name == "Propulsion" for pool in result)
        
        # Check IDs are properly formatted
        core_pool = next(pool for pool in result if pool.name == "Core Courses")
        assert core_pool._id == "AERO_Core Courses"

    def test_remove_option_course_pools(self):
        """Test removing option course pools and returning credits"""
        coursepools = [
            (AnchorLink(text="Core Courses", url="http://test.com"), 60.0),
            (AnchorLink(text="Option A", url="http://test.com"), 54.75),
            (AnchorLink(text="Option B", url="http://test.com"), 54.75),
            (AnchorLink(text="Electives", url="http://test.com"), 15.0)
        ]
        
        scraper = AeroDegreeScraper("BEng in Aerospace Engineering - Option A", "AERO", "http://test.com")
        pool_credits = scraper._remove_option_course_pools(coursepools)
        
        # Should return the credits from the first option pool
        assert (pool_credits - 54.75) < 1e-8
        
        # Should have removed both option pools
        assert len(coursepools) == 2
        remaining_names = [pool[0].text for pool in coursepools]
        assert "Core Courses" in remaining_names
        assert "Electives" in remaining_names
        assert "Option A" not in remaining_names
        assert "Option B" not in remaining_names

    def test_remove_option_course_pools_no_options(self):
        """Test removing option course pools when no options exist"""
        coursepools = [
            (AnchorLink(text="Core Courses", url="http://test.com"), 60.0),
            (AnchorLink(text="Electives", url="http://test.com"), 15.0)
        ]
        
        scraper = AeroDegreeScraper("BEng in Aerospace Engineering - Option A", "AERO", "http://test.com")
        pool_credits = scraper._remove_option_course_pools(coursepools)
        
        # Should return 0 credits when no options found
        assert (pool_credits - 0.0) < 1e-8
        
        # Should not remove any pools
        assert len(coursepools) == 2

    def test_handle_special_cases(self):
        """Test handling special cases for Aerospace Engineering"""
        # Setup scraper with program requirements including Engineering Core
        engineering_core_pool = CoursePool(
            _id="eng_core", 
            name="Engineering Core", 
            creditsRequired=30, 
            courses=["ENGR 201", "ELEC 275", "MATH 205"]
        )
        
        scraper = AeroDegreeScraper("BEng in Aerospace Engineering - Option A", "AERO", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [engineering_core_pool])
        
        scraper._handle_special_cases()
        
        updated_pool = scraper.program_requirements.coursePools[0]
        assert "ELEC 275" not in updated_pool.courses
        assert "ENGR 201" in updated_pool.courses
        assert "MATH 205" in updated_pool.courses

class TestBldgDegreeScraper:

    def test_handle_special_cases(self):
        """Test handling special cases for Building Engineering"""
        # Setup scraper with program requirements including Engineering Core
        engineering_core_pool = CoursePool(
            _id="eng_core", 
            name="Engineering Core", 
            creditsRequired=30, 
            courses=["ENGR 201", "ENGR 202", "ENGR 392"]
        )
        
        scraper = BldgDegreeScraper("BEng in Building Engineering", "BLDG", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [engineering_core_pool])
        
        scraper._handle_special_cases()
        
        updated_pool = scraper.program_requirements.coursePools[0]
        assert "ENGR 201" in updated_pool.courses
        assert "ENGR 202" not in updated_pool.courses
        assert "ENGR 392" not in updated_pool.courses
        assert "BLDG 482" in updated_pool.courses

class TestCoenDegreeScraper:
    def test_handle_special_cases(self):
        """Test handling special cases for Computer Engineering"""
        # Setup scraper with program requirements including Engineering Core
        engineering_core_pool = CoursePool(
            _id="eng_core", 
            name="Engineering Core", 
            creditsRequired=30, 
            courses=["ENGR 201", "ENGR 202", "ELEC 275"]
        )
        
        scraper = CoenDegreeScraper("BEng in Computer Engineering", "COEN", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [engineering_core_pool])
        
        scraper._handle_special_cases()
        
        updated_pool = scraper.program_requirements.coursePools[0]
        assert "ENGR 201" in updated_pool.courses
        assert "ENGR 202" in updated_pool.courses
        assert "ELEC 275" not in updated_pool.courses
        assert "ELEC 273" in updated_pool.courses

class TestElecDegreeScraper:
    def test_handle_special_cases(self):
        """Test handling special cases for Electrical Engineering"""
        # Setup scraper with program requirements including Engineering Core
        engineering_core_pool = CoursePool(
            _id="eng_core", 
            name="Engineering Core", 
            creditsRequired=30, 
            courses=["ENGR 201", "ENGR 202", "ELEC 275"]
        )
        
        scraper = ElecDegreeScraper("BEng in Electrical Engineering", "ELEC", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [engineering_core_pool])
        
        scraper._handle_special_cases()
        
        updated_pool = scraper.program_requirements.coursePools[0]
        assert "ENGR 201" in updated_pool.courses
        assert "ENGR 202" in updated_pool.courses
        assert "ELEC 275" not in updated_pool.courses
        assert "ELEC 273" in updated_pool.courses

class TestInduDegreeScraper:
    def test_handle_special_cases(self):
        """Test handling special cases for Industrial Engineering"""
        engineering_core_pool = CoursePool(
            _id="eng_core", 
            name="Engineering Core", 
            creditsRequired=30, 
            courses=["ENGR 201", "ENGR 202", "ELEC 275"]
        )
        
        general_electives_pool = CoursePool(
            _id="gen_electives",
            name="General Education Humanities and Social Sciences Electives",
            creditsRequired=3,
            courses=["ANTH 200", "HIST 201", "PHIL 214"]
        )
        
        scraper = InduDegreeScraper("BEng in Industrial Engineering", "INDU", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [engineering_core_pool, general_electives_pool])
        
        scraper._handle_special_cases()
        
        # Check Engineering Core changes
        updated_engineering_pool = scraper.program_requirements.coursePools[0]
        assert "ENGR 201" in updated_engineering_pool.courses
        assert "ENGR 202" in updated_engineering_pool.courses
        assert "ELEC 275" not in updated_engineering_pool.courses
        
        # Check General Education electives changes
        updated_general_pool = scraper.program_requirements.coursePools[1]
        assert updated_general_pool.courses == ["ACCO 220"]

class TestMechDegreeScraper:
    def test_handle_special_cases(self):
        """Test handling special cases for Mechanical Engineering"""
        engineering_core_pool = CoursePool(
            _id="eng_core", 
            name="Engineering Core", 
            creditsRequired=30, 
            courses=["ENGR 201", "ENGR 202", "ELEC 275"]
        )
        
        scraper = MechDegreeScraper("BEng in Mechanical Engineering", "MECH", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [engineering_core_pool])
        
        scraper._handle_special_cases()
        
        updated_pool = scraper.program_requirements.coursePools[0]
        assert "ENGR 201" in updated_pool.courses
        assert "ENGR 202" in updated_pool.courses
        assert "ELEC 275" not in updated_pool.courses

class TestSoenDegreeScraper:
    def test_handle_special_cases(self):
        """Test handling special cases for Software Engineering"""
        engineering_core_pool = CoursePool(
            _id="eng_core", 
            name="Engineering Core", 
            creditsRequired=30, 
            courses=["ENGR 201", "ENGR 202", "ELEC 275"]
        )
        
        scraper = SoenDegreeScraper("BEng in Software Engineering", "SOEN", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [engineering_core_pool])
        
        scraper._handle_special_cases()
        
        updated_pool = scraper.program_requirements.coursePools[0]
        assert "ENGR 201" in updated_pool.courses
        assert "ENGR 202" in updated_pool.courses
        assert "ELEC 275" in updated_pool.courses
        assert "COMP 361" in updated_pool.courses

class TestCompDegreeScraper:
    """Test Computer Science degree scraper"""

    def test_handle_special_cases(self):
        """Test handling special cases"""
        cs_electives_pool = CoursePool(
            _id="cs_electives",
            name="Computer Science Electives",
            creditsRequired=30,
            courses=["COMP 248"]
        )
        
        general_electives_pool = CoursePool(
            _id="gen_electives",
            name="General Electives: BCompSc",
            creditsRequired=15,
            courses=["COMP 249"]
        )
        
        scraper = CompDegreeScraper("BCompSc in Computer Science", "COMP", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [cs_electives_pool, general_electives_pool])
        
        with patch.object(scraper, '_handle_computer_science_electives') as mock_handle_cs, \
             patch.object(scraper, '_handle_computer_general_electives') as mock_handle_gen:
            
            scraper._handle_special_cases()
            mock_handle_cs.assert_called_once_with(cs_electives_pool)
            mock_handle_gen.assert_called_once_with(general_electives_pool)

    @patch('scraper.degree_data_scraper.get_course_scraper_instance')
    def test_handle_computer_science_electives(self, mock_get_course_scraper):
        """Test handling computer science electives with COMP courses filtering"""
        # Setup mock instance
        mock_instance = MagicMock()
        mock_instance.get_courses_by_subjects.return_value = [
            "COMP 248", "COMP 324", "COMP 325", "COMP 445", "COMP 472", "COMP invalid"
        ]
        mock_get_course_scraper.return_value = mock_instance
        
        # Setup test pool
        cs_electives_pool = CoursePool(
            _id="cs_electives",
            name="Computer Science Electives",
            creditsRequired=30,
            courses=["COMP 249"]
        )
        
        scraper = CompDegreeScraper("BCompSc in Computer Science", "COMP", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [cs_electives_pool])
        
        scraper._handle_computer_science_electives(cs_electives_pool)
        
        # Check that courses >= 325 were added
        assert "COMP 325" in cs_electives_pool.courses
        assert "COMP 445" in cs_electives_pool.courses
        assert "COMP 472" in cs_electives_pool.courses
        
        # Check that courses < 325 were not added  
        assert "COMP 248" not in cs_electives_pool.courses
        assert "COMP 324" not in cs_electives_pool.courses
        
        # Check that original course remains
        assert "COMP 249" in cs_electives_pool.courses
        assert "COMP 445" in cs_electives_pool.courses  
        assert "COMP 472" in cs_electives_pool.courses
        
        # Check that courses < 325 were not added
        assert "COMP 248" not in cs_electives_pool.courses
        assert "COMP 324" not in cs_electives_pool.courses
        
        # Check that invalid course was not added
        assert "COMP invalid" not in cs_electives_pool.courses
        
        # Check no duplicates
        assert len(cs_electives_pool.courses) == len(set(cs_electives_pool.courses))

    @patch('scraper.degree_data_scraper.get_course_scraper_instance')
    def test_handle_computer_science_electives_exception_handling(self, mock_get_course_scraper):
        """Test handling computer science electives with exception handling for invalid course numbers"""
        mock_course_scraper = mock_get_course_scraper.return_value
        mock_course_scraper.get_courses_by_subjects.return_value = [
            "COMP ABC", "COMP", "INVALID FORMAT"
        ]
        
        cs_electives_pool = CoursePool(
            _id="cs_electives",
            name="Computer Science Electives",
            creditsRequired=30,
            courses=["COMP 249"]
        )
        
        scraper = CompDegreeScraper("BCompSc in Computer Science", "COMP", "http://test.com")
        
        # Should not raise exception
        scraper._handle_computer_science_electives(cs_electives_pool)
        
        # Should only have the original course
        assert cs_electives_pool.courses == ["COMP 249"]


    @patch('scraper.degree_data_scraper.CompDegreeScraper._get_general_education_pool')
    def test_handle_computer_general_electives_combined(self, mock_get_gen_ed):
        """Test handling computer general electives with course combination and exclusion filtering"""
        exclusion_list = ["BCEE 231", "BIOL 322", "BTM 380", "BTM 382", "CART 315", 
                         "COMM 215", "EXCI 322", "GEOG 264", "INTE 296", "MAST 221", 
                         "MAST 333", "MIAE 215", "PHYS 235", "PHYS 236", "SOCI 212"]

        # Setup pools that contain excluded courses and valid courses
        mock_gen_ed_pool = CoursePool(
            _id="gen_ed",
            name="General Education",
            creditsRequired=3,
            courses=["ANTH 200", "HIST 201", "SOCI 212"] + exclusion_list[:5]
        )
        mock_get_gen_ed.return_value = mock_gen_ed_pool

        cs_electives_pool = CoursePool(
            _id="cs_electives",
            name="Computer Science Electives",
            creditsRequired=30,
            courses=["COMP 325", "COMP 445"] + exclusion_list[5:10]
        )

        math_electives_pool = CoursePool(
            _id="math_electives",
            name="Mathematics Electives: BCompSc",
            creditsRequired=15,
            courses=["MATH 205", "MAST 221"] + exclusion_list[10:]
        )

        general_electives_pool = CoursePool(
            _id="general_electives",
            name="General Electives: BCompSc",
            creditsRequired=45,
            courses=[]
        )

        scraper = CompDegreeScraper("BCompSc in Computer Science", "COMP", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, 
                                        [cs_electives_pool, math_electives_pool, general_electives_pool])

        scraper._handle_computer_general_electives(general_electives_pool)

        # Check that valid courses remain
        assert "ANTH 200" in general_electives_pool.courses
        assert "HIST 201" in general_electives_pool.courses
        assert "COMP 325" in general_electives_pool.courses
        assert "COMP 445" in general_electives_pool.courses
        assert "MATH 205" in general_electives_pool.courses

        # Check that all excluded courses are removed
        assert "SOCI 212" not in general_electives_pool.courses
        assert "MAST 221" not in general_electives_pool.courses
        for excluded_course in exclusion_list:
            assert excluded_course not in general_electives_pool.courses

class TestEcpDegreeScraper:
    
    @patch('scraper.degree_data_scraper.get_all_links_from_div')
    def test_get_ecp_core(self, mock_get_links):
        """Test ECP core course pool extraction"""
        # Setup mock course links
        mock_get_links.return_value = [
            AnchorLink(text="MATH 203", url="http://test1.com"),
            AnchorLink(text="MATH 204", url="http://test2.com")
        ]

        scraper = EcpDegreeScraper("BEng in Extended Credit Program", "ECP", "http://test.com")
        credits_required = 18.0
        pool = scraper.get_ecp_core(credits_required)

        assert isinstance(pool, CoursePool)
        assert pool._id == "ECP_Core"
        assert pool.name == "ECP Core"
        assert (pool.creditsRequired - credits_required) < 1e8
        assert pool.courses == ["MATH 203", "MATH 204"]

class TestEngrEcpDegreeScraper:
        @patch('scraper.degree_data_scraper.get_all_links_from_div')
        @patch('scraper.degree_data_scraper.EngrEcpDegreeScraper._get_general_education_pool')
        def test_get_program_requirements(self, mock_get_gen_ed, mock_get_links):
            """Test EngrEcpDegreeScraper _get_program_requirements sets all pools correctly"""
            # Setup mocks for course links
            def get_links_side_effect(url, classes, group_name, include_regex=None):
                if group_name == "Extended Credit Program":
                    return [AnchorLink(text="MATH 203", url="http://test1.com"), AnchorLink(text="MATH 204", url="http://test2.com")]
                elif group_name == "Natural Science Electives":
                    return [AnchorLink(text="CHEM 221", url="http://test3.com"), AnchorLink(text="PHYS 204", url="http://test4.com")]
                return []
            mock_get_links.side_effect = get_links_side_effect

            # Setup mock for general education pool
            mock_gen_ed_pool = CoursePool(_id="gen_ed", name="General Education", creditsRequired=6.0, courses=["ANTH 200", "HIST 201"])
            mock_get_gen_ed.return_value = mock_gen_ed_pool

            scraper = EngrEcpDegreeScraper("BEng in Extended Credit Program", "ECP", "http://test.com")
            scraper._get_program_requirements()

            req = scraper.program_requirements
            assert req.degree.name == "BEng in Extended Credit Program"
            assert (req.degree.totalCredits - 30.0) < 1e-8
            assert req.degree.degreeType == DegreeType.ECP
            assert len(req.coursePools) == 3

            # Check ECP Core pool
            ecp_core_pool = req.coursePools[0]
            assert ecp_core_pool.name == "ECP Core"
            assert (ecp_core_pool.creditsRequired - 18.0) < 1e-8
            assert ecp_core_pool.courses == ["MATH 203", "MATH 204"]

            # Check Natural Science Electives pool
            nat_sci_pool = req.coursePools[1]
            assert nat_sci_pool.name == "Natural Science Electives"
            assert (nat_sci_pool.creditsRequired - 6.0) < 1e-8
            assert nat_sci_pool.courses == ["CHEM 221", "PHYS 204"]

            # Check General Education pool
            gen_ed_pool = req.coursePools[2]
            assert gen_ed_pool is mock_gen_ed_pool

class TestCompEcpDegreeScraper:
    @patch('scraper.degree_data_scraper.get_all_links_from_div')
    @patch('scraper.degree_data_scraper.CompEcpDegreeScraper._get_general_education_pool')
    @patch('scraper.degree_data_scraper.CompEcpDegreeScraper.get_ecp_core')
    @patch('scraper.degree_data_scraper.get_course_scraper_instance')
    def test_get_program_requirements(self, mock_get_course_scraper, mock_get_ecp_core, mock_get_gen_ed, mock_get_links):
        """Test CompEcpDegreeScraper _get_program_requirements sets all pools correctly"""
        # Mock ECP Core pool
        ecp_core_pool = CoursePool(_id="ECP_Core", name="ECP Core", creditsRequired=9.0, courses=["MATH 203"])
        mock_get_ecp_core.return_value = ecp_core_pool
        
        # Mock General Education pool
        gen_ed_pool = CoursePool(_id="gen_ed", name="General Education", creditsRequired=6.0, courses=["ANTH 200"])
        mock_get_gen_ed.return_value = gen_ed_pool
        
        # Mock exclusion list
        exclusion_list = ["COMP 248", "COMP 249"]
        mock_get_links.return_value = exclusion_list
        
        # Setup mock instance
        mock_instance = MagicMock()
        
        # Mock get_courses_by_subjects for each pool
        def get_courses_side_effect(subjects, inclusive=False):
            if set(subjects) == set(["ENCS", "ENGR", "AERO", "BCEE", "BLDG", "CIVI", "COEN", "ELEC", "IADI", "INDU", "MECH", "MIAE", "COMP", "SOEN"]):
                return ["COMP 248", "COMP 324", "COMP 445"]
            elif set(subjects) == set(["ENCS", "ENGR", "AERO", "BCEE", "BLDG", "CIVI", "COEN", "ELEC", "IADI", "INDU", "MECH", "MIAE", "COMP", "SOEN", "DART", "CART"]):
                return ["CART 315", "COMP 249", "COMP 445"]
            elif set(subjects) == set(["ENCS", "ENGR", "AERO", "BCEE", "BLDG", "CIVI", "COEN", "ELEC", "IADI", "INDU", "MECH", "MIAE", "COMP", "SOEN", "ACTU", "MACF", "MATH", "MAST", "STAT"]):
                return ["MAST 221", "COMP 324", "COMP 445"]
            return []
        mock_instance.get_courses_by_subjects.side_effect = get_courses_side_effect
        mock_get_course_scraper.return_value = mock_instance
        
        scraper = CompEcpDegreeScraper("BCompSc in Computer Science", "COMP", "http://test.com")
        scraper._get_program_requirements()
        
        req = scraper.program_requirements
        assert req.degree.name == "BCompSc in Computer Science"
        assert (req.degree.totalCredits - 30.0) < 1e-8
        assert req.degree.degreeType == DegreeType.ECP
        assert len(req.coursePools) == 5

        # ECP Core
        assert req.coursePools[0] is ecp_core_pool
        # General Education
        assert req.coursePools[1] is gen_ed_pool

        # ECP Electives: BCompSc (other than Joint Majors)
        bcompsc_pool = req.coursePools[2]
        assert bcompsc_pool.name == "ECP Electives: BCompSc (other than Joint Majors)"
        assert (bcompsc_pool.creditsRequired - 15.0) < 1e-8
        # Should filter out exclusion_list
        assert bcompsc_pool.courses == ["COMP 324", "COMP 445"]

        # ECP Electives: Joint Major in Computation Arts and Computer Science
        comp_arts_pool = req.coursePools[3]
        assert comp_arts_pool.name == "ECP Electives: Joint Major in Computation Arts and Computer Science"
        assert (comp_arts_pool.creditsRequired - 15.0) < 1e-8
        assert comp_arts_pool.courses == ["CART 315", "COMP 445"]

        # ECP Electives: Joint Major in Data Science
        data_science_pool = req.coursePools[4]
        assert data_science_pool.name == "ECP Electives: Joint Major in Data Science"
        assert (data_science_pool.creditsRequired - 15.0) < 1e-8
        assert data_science_pool.courses == ["MAST 221", "COMP 324", "COMP 445"]

class TestCoopDegreeScraper:
    @patch('scraper.degree_data_scraper.get_course_scraper_instance')
    def test_get_program_requirements(self, mock_get_course_scraper):
        """Test CoopDegreeScraper _get_program_requirements sets co-op pool and removes CWT 400/401"""
        # Setup mock instance
        mock_instance = MagicMock()
        mock_instance.get_courses_by_subjects.return_value = ["CWT 300", "CWT 301", "CWT 400", "CWT 401"]
        mock_get_course_scraper.return_value = mock_instance

        scraper = CoopDegreeScraper("BEng in Computer Engineering Co-op", "COEN", "http://test.com")
        scraper._get_program_requirements()

        req = scraper.program_requirements
        assert req.degree.name == "BEng in Computer Engineering Co-op"
        assert (req.degree.totalCredits - 0.0) < 1e-8
        assert req.degree.degreeType == DegreeType.COOP
        assert len(req.coursePools) == 1

        pool = req.coursePools[0]
        assert pool.name == "Co-op Work Terms"
        assert (pool.creditsRequired - 0.0) < 1e-8
        # CWT 400 and CWT 401 should be removed
        assert "CWT 400" not in pool.courses
        assert "CWT 401" not in pool.courses
        assert set(pool.courses) == {"CWT 300", "CWT 301"}