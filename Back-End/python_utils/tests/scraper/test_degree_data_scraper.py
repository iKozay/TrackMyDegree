import pytest
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scraper.degree_data_scraper import DegreeDataScraper
from scraper.abstract_degree_scraper import AbstractDegreeScraper
from models import AnchorLink, CoursePool, Degree, DegreeType, ProgramRequirements


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
        mock_degree = Degree(_id=degree_name, name=degree_name, totalCredits=120.0, degreeType=DegreeType.STANDALONE, coursePools=[])
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
            mock_degree = Degree(_id=degree_name,name=degree_name, totalCredits=120.0, degreeType=DegreeType.STANDALONE, coursePools=[])
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