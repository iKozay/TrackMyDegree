from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scraper.comp_sci_degree_scraper import CompDegreeScraper
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