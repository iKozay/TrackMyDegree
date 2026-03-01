from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scraper.comp_sci_degree_scraper import (
    CompDegreeScraper,
    CompVariantDegreeScraper,
    CompCaDegreeScraper,
    CompDsDegreeScraper
)
from models import CoursePool, DegreeType


class TestCompDegreeScraper:
    """Test Computer Science degree scraper"""

    def test_handle_special_cases(self):
        """Test handling special cases for Computer Science"""
        # Setup scraper with program requirements including Computer Science Electives and General Electives
        cs_electives_pool = CoursePool(
            _id="cs_electives", 
            name="Computer Science Electives", 
            creditsRequired=30, 
            courses=["COMP 352", "COMP 353"]
        )
        general_electives_pool = CoursePool(
            _id="gen_electives", 
            name="General Electives: BCompSc", 
            creditsRequired=18, 
            courses=[]
        )
        math_electives_pool = CoursePool(
            _id="math_electives", 
            name="Mathematics Electives: BCompSc", 
            creditsRequired=9, 
            courses=["MATH 363", "MATH 364"]
        )
        
        scraper = CompDegreeScraper("BCompSc in Computer Science", "COMP", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [cs_electives_pool, general_electives_pool, math_electives_pool])
        
        with patch.object(scraper, '_handle_computer_science_electives') as mock_handle_cs, \
             patch.object(scraper, '_handle_computer_general_electives') as mock_handle_gen:
            
            scraper._handle_special_cases()
            
            mock_handle_cs.assert_called_once_with(cs_electives_pool)
            mock_handle_gen.assert_called_once_with(general_electives_pool)

    @patch('scraper.comp_sci_degree_scraper.get_course_scraper_instance')
    def test_handle_computer_science_electives(self, mock_get_course_scraper):
        """Test handling computer science electives pool"""
        mock_course_scraper = MagicMock()
        mock_course_scraper.get_courses_by_subjects.return_value = ["COMP 248", "COMP 249", "COMP 325", "COMP 352", "COMP 361"]
        mock_get_course_scraper.return_value = mock_course_scraper
        
        cs_electives_pool = CoursePool(
            _id="cs_electives", 
            name="Computer Science Electives", 
            creditsRequired=30, 
            courses=["COMP 352", "COMP 353"]
        )
        
        scraper = CompDegreeScraper("BCompSc in Computer Science", "COMP", "http://test.com")
        scraper._handle_computer_science_electives(cs_electives_pool)
        
        # Should include COMP courses 325 and higher
        assert "COMP 325" in cs_electives_pool.courses
        assert "COMP 352" in cs_electives_pool.courses
        assert "COMP 361" in cs_electives_pool.courses
        # Should not include courses below 325
        assert "COMP 248" not in cs_electives_pool.courses
        assert "COMP 249" not in cs_electives_pool.courses
        # Should not have duplicates
        assert cs_electives_pool.courses.count("COMP 352") == 1

    @patch('scraper.comp_sci_degree_scraper.get_course_scraper_instance')
    def test_handle_computer_general_electives(self, mock_get_course_scraper):
        """Test handling computer general electives pool"""
        mock_course_scraper = MagicMock()
        mock_get_course_scraper.return_value = mock_course_scraper
        
        # Setup pools
        cs_electives_pool = CoursePool(
            _id="cs_electives", 
            name="Computer Science Electives", 
            creditsRequired=30, 
            courses=["COMP 352", "COMP 353"]
        )
        math_electives_pool = CoursePool(
            _id="math_electives", 
            name="Mathematics Electives: BCompSc", 
            creditsRequired=9, 
            courses=["MATH 363", "MATH 364"]
        )
        general_electives_pool = CoursePool(
            _id="gen_electives", 
            name="General Electives: BCompSc", 
            creditsRequired=18, 
            courses=[]
        )
        
        # Setup scraper with all required pools
        scraper = CompDegreeScraper("BCompSc in Computer Science", "COMP", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [cs_electives_pool, math_electives_pool, general_electives_pool])
        
        # Mock the _get_general_education_pool method
        mock_gen_ed_pool = CoursePool(
            _id="gen_ed", 
            name="General Education", 
            creditsRequired=6, 
            courses=["ANTH 101", "PHIL 212", "MAST 221"]  # MAST 221 should be excluded
        )
        with patch.object(scraper, '_get_general_education_pool', return_value=mock_gen_ed_pool):
            scraper._handle_computer_general_electives(general_electives_pool)
        
        # Should include courses from CS electives
        assert "COMP 352" in general_electives_pool.courses
        assert "COMP 353" in general_electives_pool.courses
        # Should include courses from Math electives
        assert "MATH 363" in general_electives_pool.courses
        assert "MATH 364" in general_electives_pool.courses
        # Should include courses from General Education (excluding exclusion list)
        assert "ANTH 101" in general_electives_pool.courses
        assert "PHIL 212" in general_electives_pool.courses
        # Should exclude courses from exclusion list
        assert "MAST 221" not in general_electives_pool.courses

    @patch('scraper.comp_sci_degree_scraper.CompDegreeScraper._get_general_education_pool')
    def test_handle_computer_general_electives_exclusions(self, mock_get_gen_ed):
        """Test that excluded courses are properly removed from general electives"""
        # Mock general education pool with some excluded courses
        mock_gen_ed_pool = CoursePool(
            _id="gen_ed", 
            name="General Education", 
            creditsRequired=6, 
            courses=["ANTH 101", "BCEE 231", "BTM 380", "CART 315", "COMM 215"]
        )
        mock_get_gen_ed.return_value = mock_gen_ed_pool
        
        # Setup pools
        cs_electives_pool = CoursePool(
            _id="cs_electives", 
            name="Computer Science Electives", 
            creditsRequired=30, 
            courses=["COMP 352"]
        )
        math_electives_pool = CoursePool(
            _id="math_electives", 
            name="Mathematics Electives: BCompSc", 
            creditsRequired=9, 
            courses=["MATH 363"]
        )
        general_electives_pool = CoursePool(
            _id="gen_electives", 
            name="General Electives: BCompSc", 
            creditsRequired=18, 
            courses=[]
        )
        
        scraper = CompDegreeScraper("BCompSc in Computer Science", "COMP", "http://test.com")
        scraper._set_program_requirements("Test", 120.0, DegreeType.STANDALONE, [cs_electives_pool, math_electives_pool, general_electives_pool])
        
        scraper._handle_computer_general_electives(general_electives_pool)
        
        # Should include allowed courses
        assert "ANTH 101" in general_electives_pool.courses
        assert "COMP 352" in general_electives_pool.courses
        assert "MATH 363" in general_electives_pool.courses
        
        # Should exclude courses from exclusion list
        assert "BCEE 231" not in general_electives_pool.courses
        assert "BTM 380" not in general_electives_pool.courses
        assert "CART 315" not in general_electives_pool.courses
        assert "COMM 215" not in general_electives_pool.courses


class TestCompVariantDegreeScraper:
    """Test Computer Science variant degree scraper"""

    @patch('scraper.comp_sci_degree_scraper.CompDegreeScraper')
    def test_get_program_node_exact_match(self, mock_comp_scraper):
        """Test finding program node with exact degree name match"""
        # Mock the CompDegreeScraper constructor and scrape_degree
        mock_instance = MagicMock()
        mock_instance.scrape_degree.return_value = MagicMock()
        mock_comp_scraper.return_value = mock_instance
        
        mock_soup = MagicMock()
        mock_program_node = MagicMock()
        
        # Setup to return node on first try (exact match)
        mock_soup.find.return_value = mock_program_node
        
        scraper = CompVariantDegreeScraper("BCompSc Joint Major in Data Science", "COMP_DS", "http://test.com")
        
        result = scraper._get_program_node(mock_soup)
        
        assert result == mock_program_node
        # Should try with exact name first
        mock_soup.find.assert_called_with("div", class_="program-node", attrs={"title": "BCompSc Joint Major in Data Science"})

    @patch('scraper.comp_sci_degree_scraper.CompDegreeScraper')
    def test_get_program_node_with_replacement(self, mock_comp_scraper):
        """Test finding program node with BCompSc replacement"""
        # Mock the CompDegreeScraper
        mock_instance = MagicMock()
        mock_instance.scrape_degree.return_value = MagicMock()
        mock_comp_scraper.return_value = mock_instance
        
        mock_soup = MagicMock()
        mock_program_node = MagicMock()
        
        # Setup to return None on first try, node on second try
        mock_soup.find.side_effect = [None, mock_program_node]
        
        scraper = CompVariantDegreeScraper("BCompSc Joint Major in Data Science", "COMP_DS", "http://test.com")
        
        result = scraper._get_program_node(mock_soup)
        
        assert result == mock_program_node
        # Should have been called twice - first exact, then with replacement
        assert mock_soup.find.call_count == 2

    @patch('scraper.comp_sci_degree_scraper.CompDegreeScraper')
    def test_handle_failed_course_pools(self, mock_comp_scraper):
        """Test handling failed course pools using computer science requirements"""
        # Setup computer science requirements
        cs_requirements = MagicMock()
        cs_requirements.coursePools = [
            CoursePool(_id="cs_core", name="Computer Science Core", creditsRequired=33, courses=["COMP 248", "COMP 249"]),
            CoursePool(_id="cs_electives", name="Computer Science Electives", creditsRequired=30, courses=["COMP 352"])
        ]
        
        # Mock the CompDegreeScraper
        mock_instance = MagicMock()
        mock_instance.scrape_degree.return_value = cs_requirements
        mock_comp_scraper.return_value = mock_instance
        
        scraper = CompVariantDegreeScraper("BCompSc Joint Major in Data Science", "COMP_DS", "http://test.com")
        
        # Setup failed pools
        failed_pool_1 = CoursePool(_id="failed1", name="Computer Science Core", creditsRequired=33, courses=[])
        failed_pool_2 = CoursePool(_id="failed2", name="Some Unknown Pool", creditsRequired=6, courses=[])
        
        with patch.object(scraper, 'logger') as mock_logger:
            scraper._handle_failed_course_pools([failed_pool_1, failed_pool_2])
        
        # Should copy courses from CS requirements
        assert failed_pool_1.courses == ["COMP 248", "COMP 249"]
        # Should log error for unknown pool
        mock_logger.error.assert_called_once()


class TestCompCaDegreeScraper:
    """Test Computation Arts Computer Science scraper"""

    @patch('scraper.comp_sci_degree_scraper.get_course_scraper_instance')
    @patch('scraper.comp_sci_degree_scraper.get_all_links_from_div')
    @patch('scraper.comp_sci_degree_scraper.CompDegreeScraper')
    def test_handle_special_cases(self, mock_comp_scraper, mock_get_links, mock_get_course_scraper):
        """Test handling special cases for Computation Arts"""
        # Mock CompDegreeScraper
        mock_instance = MagicMock()
        mock_instance.scrape_degree.return_value = MagicMock()
        mock_comp_scraper.return_value = mock_instance
        
        # Mock course scraper
        mock_course_scraper = MagicMock()
        mock_course_scraper.get_courses_by_subjects.return_value = [
            "CART 200", "CART 315", "CART 399", "DART 100", "DART 200"
        ]
        mock_get_course_scraper.return_value = mock_course_scraper
        
        # Mock links from div
        mock_link_1 = MagicMock()
        mock_link_1.text = "COMP 345"
        mock_link_2 = MagicMock()
        mock_link_2.text = "COMP 371"
        mock_get_links.return_value = [mock_link_1, mock_link_2]
        
        # Setup Computation Arts Core pool
        comp_arts_pool = CoursePool(
            _id="comp_arts_core", 
            name="Computation Arts Core", 
            creditsRequired=24, 
            courses=["CART 210", "CART 311"]
        )
        
        scraper = CompCaDegreeScraper("BCompSc Joint Major in Computation Arts and Computer Science", "COMP_CA", "http://test.com")
        
        # Mock the program requirements directly instead of using ProgramRequirements constructor
        scraper.program_requirements = MagicMock()
        scraper.program_requirements.coursePools = [comp_arts_pool]
        scraper.program_requirements.degree = MagicMock()
        scraper.program_requirements.degree.coursePools = []
        
        scraper._handle_special_cases()
        
        # Should have added CART 315+ and DART courses
        assert "CART 315" in comp_arts_pool.courses
        assert "CART 399" in comp_arts_pool.courses
        assert "DART 100" in comp_arts_pool.courses
        assert "DART 200" in comp_arts_pool.courses
        # Should not add CART courses below 300
        assert "CART 200" not in comp_arts_pool.courses
        
        # Should have added Other Required Courses pool
        assert len(scraper.program_requirements.coursePools) == 2
        other_pool = scraper.program_requirements.coursePools[1]
        assert other_pool.name == "Other Required Courses"
        assert other_pool.courses == ["COMP 345", "COMP 371"]


class TestCompDsDegreeScraper:
    """Test Data Science Computer Science scraper"""

    @patch('scraper.comp_sci_degree_scraper.CompDegreeScraper')
    def test_handle_special_cases(self, mock_comp_scraper):
        """Test handling special cases for Data Science - replacing COMP 233 with MAST 221"""
        # Mock CompDegreeScraper
        mock_instance = MagicMock()
        mock_instance.scrape_degree.return_value = MagicMock()
        mock_comp_scraper.return_value = mock_instance
        
        # Setup Computer Science Core pool with COMP 233
        cs_core_pool = CoursePool(
            _id="cs_core", 
            name="Computer Science Core", 
            creditsRequired=33, 
            courses=["COMP 248", "COMP 233", "COMP 249"]
        )
        
        scraper = CompDsDegreeScraper("BCompSc Joint Major in Data Science", "COMP_DS", "http://test.com")
        
        # Mock the program requirements directly
        scraper.program_requirements = MagicMock()
        scraper.program_requirements.coursePools = [cs_core_pool]
        
        with patch.object(scraper, 'remove_courses_from_pool') as mock_remove:
            scraper._handle_special_cases()
        
        # Should remove COMP 233
        mock_remove.assert_called_once_with(cs_core_pool, ["COMP 233"])
        # Should add MAST 221
        assert "MAST 221" in cs_core_pool.courses