import pytest
from unittest.mock import patch, MagicMock
import sys
import os
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scraper.gina_cody_degree_scraper import GinaCodyDegreeScraper, AeroDegreeScraper
from models import AnchorLink, CoursePool, DegreeType, ECPDegreeIDs


class TestGinaCodyDegreeScraper:
    """Test Gina Cody School of Engineering and Computer Science scraper"""

    @patch('scraper.gina_cody_degree_scraper.get_soup')
    @patch('scraper.gina_cody_degree_scraper.extract_name_and_credits')
    @patch('scraper.gina_cody_degree_scraper.extract_coursepool_rules')
    @patch('scraper.gina_cody_degree_scraper.extract_coursepool_courses')
    def test_get_program_requirements(self, mock_extract_courses, mock_extract_rules, mock_extract_name, mock_get_soup):
        # Mock the soup and extraction functions
        mock_soup = BeautifulSoup('<div class="program-node" title="BEng in Computer Engineering"><h3>BEng in Computer Engineering (120 credits)</h3><table></table></div>', 'html.parser')
        mock_get_soup.return_value = mock_soup
        mock_extract_name.return_value = ("BEng in Computer Engineering", 120.0)
        mock_extract_courses.return_value = False
        
        # Mock extract_coursepool_and_required_credits
        with patch('scraper.gina_cody_degree_scraper.extract_coursepool_and_required_credits') as mock_extract_pools:
            mock_extract_pools.return_value = [(AnchorLink(text="Core Courses", url="http://test.com"), 60.0)]
            
            scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
            scraper._get_program_requirements()
            
            assert scraper.program_requirements is not None
            assert scraper.program_requirements.degree.name == "BEng in Computer Engineering"

    def test_get_program_node_success(self):
        """Test successfully finding program node"""
        soup = BeautifulSoup('<div class="program-node" title="BEng in Computer Engineering"></div>', 'html.parser')
        
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
        result = scraper._get_program_node(soup)
        
        assert result is not None
        assert result.get('title') == "BEng in Computer Engineering"

    def test_get_program_node_not_found(self):
        """Test when program node is not found"""
        soup = BeautifulSoup('<div>No matching content</div>', 'html.parser')
        
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
        
        with pytest.raises(ValueError, match="Program node for 'BEng in Computer Engineering' not found"):
            scraper._get_program_node(soup)

    @patch('scraper.gina_cody_degree_scraper.extract_coursepool_and_required_credits')
    def test_get_course_pools_without_courses(self, mock_extract_pools):
        """Test extracting course pools without courses"""
        mock_extract_pools.return_value = [(AnchorLink(text="Core Courses", url="http://test.com"), 60.0)]
        
        program_node = BeautifulSoup('<table></table>', 'html.parser')
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
        
        result = scraper._get_course_pools_without_courses(program_node)
        
        assert len(result) == 1
        assert result[0].name == "Core Courses"
        assert abs(result[0].creditsRequired - 60.0) < 1e-8

    @patch('scraper.gina_cody_degree_scraper.extract_coursepool_rules')
    @patch('scraper.gina_cody_degree_scraper.extract_coursepool_courses')
    def test_extract_course_pool_data(self, mock_extract_courses, mock_extract_rules):
        """Test extracting courses for course pools"""
        # Mock that first pool succeeds, second pool fails
        def mock_extraction(url, pool):
            if pool.name == "Pool 1":
                pool.courses = ["COMP 248", "COMP 249"]  # Simulate successful extraction
                return True
            else:
                return False  # Simulate failed extraction
        
        mock_extract_courses.side_effect = mock_extraction
        
        pools = [
            CoursePool(_id="pool1", name="Pool 1", creditsRequired=30, courses=[]),
            CoursePool(_id="pool2", name="Pool 2", creditsRequired=30, courses=[])
        ]
        
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
        failed_pools = scraper._extract_course_pool_data(pools)
        
        assert len(failed_pools) == 1
        assert failed_pools[0].name == "Pool 2"

    @patch('scraper.gina_cody_degree_scraper.GinaCodyDegreeScraper._handle_engineering_core')
    def test_handle_failed_course_pools_with_engineering_core(self, mock_handle_engineering):
        """Test handling failed course pools with engineering core"""
        pool = CoursePool(_id="test", name="Engineering Core", creditsRequired=30, courses=[])
        
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
        scraper._handle_failed_course_pools([pool])
        
        mock_handle_engineering.assert_called_once_with(pool)

    def test_handle_failed_course_pools_without_special_handling(self):
        """Test handling failed course pools without special handling"""
        pool = CoursePool(_id="test", name="Random Pool", creditsRequired=30, courses=[])
        
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [])
        
        with patch.object(scraper, 'logger') as mock_logger:
            scraper._handle_failed_course_pools([pool])
            mock_logger.warning.assert_called_once()

    @patch('scraper.gina_cody_degree_scraper.get_all_links_from_div')
    @patch('scraper.gina_cody_degree_scraper.GinaCodyDegreeScraper._get_general_education_pool')
    def test_handle_engineering_core(self, mock_get_gen_ed, mock_get_links):
        """Test handling engineering core pool"""
        mock_get_links.return_value = [AnchorLink(text="ENGR 201", url="http://test.com")]
        mock_gen_ed_pool = CoursePool(_id="gen_ed", name="General Education", creditsRequired=3, courses=[])
        mock_get_gen_ed.return_value = mock_gen_ed_pool
        
        pool = CoursePool(_id="eng_core", name="Engineering Core", creditsRequired=33, courses=[])
        
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [pool])
        
        scraper._handle_engineering_core(pool)
        
        assert "ENGR 201" in pool.courses
        assert abs(pool.creditsRequired - 30.0) < 1e-8
        assert len(scraper.program_requirements.coursePools) == 2

    @patch('scraper.gina_cody_degree_scraper.get_course_scraper_instance')
    def test_get_general_education_pool(self, mock_get_course_scraper):
        """Test getting general education pool"""
        mock_course_scraper = MagicMock()
        mock_course_scraper.get_courses_by_subjects.return_value = ["ANTH 101", "PHIL 212", "SOCI 212"]
        mock_get_course_scraper.return_value = mock_course_scraper
        
        scraper = GinaCodyDegreeScraper("BEng in Computer Engineering", "COEN", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
        result = scraper._get_general_education_pool()
        
        assert result.name == "General Education Humanities and Social Sciences Electives"
        assert abs(result.creditsRequired - 3.0) < 1e-8
        assert "ANTH 101" in result.courses
        assert "SOCI 212" not in result.courses  # Should be excluded
        assert "COMS 360" in result.courses  # Should be added from other_allowed_courses


class TestAeroDegreeScraper:
    """Test AeroDegreeScraper class"""

    def test_init(self):
        """Test AeroDegreeScraper initialization and degree name splitting"""
        scraper = AeroDegreeScraper("BEng in Aerospace Engineering Option: Aerodynamics and Propulsion", "AERO", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
        
        assert scraper.degree_name == "BEng in Aerospace Engineering Option: Aerodynamics and Propulsion"
        assert scraper.degree_short_name == "AERO"
        assert scraper.requirements_url == "http://test.com"
        assert scraper.degree_name_without_option == "BEng in Aerospace Engineering"
        assert scraper.option_name == "Option A"

    def test_get_program_node_success(self):
        """Test successfully finding program node using degree_name_without_option"""
        soup = BeautifulSoup('<div class="program-node" title="BEng in Aerospace Engineering"></div>', 'html.parser')
        
        scraper = AeroDegreeScraper("BEng in Aerospace Engineering Option: Aerodynamics and Propulsion", "AERO", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
        result = scraper._get_program_node(soup)
        
        assert result is not None
        assert result.get('title') == "BEng in Aerospace Engineering"

    def test_get_program_node_not_found(self):
        """Test when program node is not found"""
        soup = BeautifulSoup('<div>No matching content</div>', 'html.parser')
        
        scraper = AeroDegreeScraper("BEng in Aerospace Engineering Option: Aerodynamics and Propulsion", "AERO", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
        
        with pytest.raises(ValueError, match="Program node for 'BEng in Aerospace Engineering Option: Aerodynamics and Propulsion' not found"):
            scraper._get_program_node(soup)

    @patch('scraper.gina_cody_degree_scraper.get_soup')
    @patch('scraper.gina_cody_degree_scraper.extract_coursepool_and_required_credits')
    def test_get_course_pools_without_courses(self, mock_extract_pools, mock_get_soup):
        """Test extracting course pools for aerospace degree"""
        # Mock main program table
        mock_extract_pools.side_effect = [
            [(AnchorLink(text="Core Courses", url="http://test.com"), 60.0),
             (AnchorLink(text="Option A", url="http://test.com"), 54.75),
             (AnchorLink(text="Option B", url="http://test.com"), 54.75)],
            [(AnchorLink(text="Option A Courses", url="http://test.com"), 30.0)]
        ]
        
        # Mock soup for option search
        option_soup = BeautifulSoup(
            '<div class="defined-group" title="Option A"><h3>Option A — Test (54.75 credits)</h3><table></table></div>',
            'html.parser'
        )
        mock_get_soup.return_value = option_soup
        
        program_node = BeautifulSoup('<table></table>', 'html.parser')
        scraper = AeroDegreeScraper("BEng in Aerospace Engineering Option: Aerodynamics and Propulsion", "AERO", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
        
        result = scraper._get_course_pools_without_courses(program_node)
        
        assert len(result) == 2  # Core + Option A courses
        pool_names = [pool.name for pool in result]
        assert "Core Courses" in pool_names
        assert "Option A Courses" in pool_names

    def test_remove_option_course_pools(self):
        """Test removing option course pools and returning credits"""
        coursepools = [
            (AnchorLink(text="Core Courses", url="http://test.com"), 60.0),
            (AnchorLink(text="Option A", url="http://test.com"), 54.75),
            (AnchorLink(text="Option B", url="http://test.com"), 54.75),
            (AnchorLink(text="Electives", url="http://test.com"), 15.0)
        ]
        
        scraper = AeroDegreeScraper("BEng in Aerospace Engineering Option: Aerodynamics and Propulsion", "AERO", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
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
        
        scraper = AeroDegreeScraper("BEng in Aerospace Engineering Option: Aerodynamics and Propulsion", "AERO", ECPDegreeIDs.ENGR_ECP_ID, "http://test.com")
        pool_credits = scraper._remove_option_course_pools(coursepools)
        
        # Should return 0 credits when no options found
        assert (pool_credits - 0.0) < 1e-8
        
        # Should not remove any pools
        assert len(coursepools) == 2