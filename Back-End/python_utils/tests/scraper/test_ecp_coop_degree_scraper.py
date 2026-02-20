from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scraper.ecp_coop_degree_scraper import *
from models import CoursePool, AnchorLink


class TestEcpDegreeScraper:
    
    @patch('scraper.ecp_coop_degree_scraper.get_all_links_from_div')
    def test_get_ecp_core(self, mock_get_links):
        """Test getting ECP core course pool"""
        mock_get_links.return_value = [
            AnchorLink(text="MATH 200", url="http://test.com"),
            AnchorLink(text="MATH 201", url="http://test.com"),
            AnchorLink(text="ENGL 212", url="http://test.com")
        ]
        
        scraper = EcpDegreeScraper("Extended Credit Program - Engineering", "ENGR_ECP", "http://test.com")
        result = scraper.get_ecp_core(credits_required=18.0)
        
        assert result.name == "ECP Core"
        assert abs(result.creditsRequired - 18.0) < 1e-8
        assert "MATH 200" in result.courses
        assert "MATH 201" in result.courses
        assert "ENGL 212" in result.courses
        assert result._id == "ENGR_ECP_Core"
    
    @patch('scraper.ecp_coop_degree_scraper.GinaCodyDegreeScraper._get_general_education_pool')
    def test_get_general_education_pool(self, mock_super_get_gen_ed):
        """Test getting ECP general education pool"""
        mock_base_pool = CoursePool(
            _id="General Education Humanities and Social Sciences Electives",
            name="General Education Humanities and Social Sciences Electives",
            creditsRequired=6.0,
            courses=["ANTH 101", "PHIL 212"]
        )
        mock_super_get_gen_ed.return_value = mock_base_pool
        
        scraper = EcpDegreeScraper("Extended Credit Program - Engineering", "ENGR_ECP", "http://test.com")
        result = scraper._get_general_education_pool(credits_required=6.0)
        
        assert result.name == "ECP General Education Humanities and Social Sciences Electives"
        assert result._id == "ECP_General Education Humanities and Social Sciences Electives"
        assert abs(result.creditsRequired - 6.0) < 1e-8
        assert result.courses == ["ANTH 101", "PHIL 212"]


class TestEngrEcpDegreeScraper:
    @patch('scraper.ecp_coop_degree_scraper.get_all_links_from_div')
    @patch('scraper.ecp_coop_degree_scraper.EngrEcpDegreeScraper._get_general_education_pool')
    def test_get_program_requirements(self, mock_get_gen_ed, mock_get_links):
        """Test getting program requirements for Engineering ECP"""
        # Mock ECP Core courses
        mock_get_links.side_effect = [
            # First call for ECP Core
            [AnchorLink(text="MATH 200", url="http://test.com"), 
             AnchorLink(text="ENGL 212", url="http://test.com")],
            # Second call for Natural Science Electives
            [AnchorLink(text="PHYS 204", url="http://test.com"),
             AnchorLink(text="CHEM 205", url="http://test.com")]
        ]
        
        # Mock general education pool
        mock_gen_ed_pool = CoursePool(
            _id="ECP_General Education",
            name="ECP General Education",
            creditsRequired=6.0,
            courses=["ANTH 101"]
        )
        mock_get_gen_ed.return_value = mock_gen_ed_pool
        
        scraper = EngrEcpDegreeScraper("Extended Credit Program - Engineering", "ENGR_ECP", "http://test.com")
        scraper._get_program_requirements()
        
        assert scraper.program_requirements is not None
        assert scraper.program_requirements.degree.name == "Extended Credit Program - Engineering"
        assert abs(scraper.program_requirements.degree.totalCredits - 30.0) < 1e-8
        assert scraper.program_requirements.degree.degreeType == "ECP"
        
        # Should have 3 course pools: ECP Core, Natural Science Electives, General Education
        assert len(scraper.program_requirements.coursePools) == 3
        
        pool_names = [pool.name for pool in scraper.program_requirements.coursePools]
        assert "ECP Core" in pool_names
        assert "ECP Natural Science Electives" in pool_names
        assert "ECP General Education" in pool_names

    def test_handle_special_cases(self):
        """Test that engineering ECP has no special cases"""
        scraper = EngrEcpDegreeScraper("Extended Credit Program - Engineering", "ENGR_ECP", "http://test.com")
        # Should not raise any exceptions
        scraper._handle_special_cases()


class TestCompEcpDegreeScraper:
    @patch('scraper.ecp_coop_degree_scraper.get_all_links_from_div')
    @patch('scraper.ecp_coop_degree_scraper.CompEcpDegreeScraper._get_general_education_pool')
    @patch('scraper.ecp_coop_degree_scraper.CompEcpDegreeScraper.get_ecp_core')
    @patch('scraper.ecp_coop_degree_scraper.get_course_scraper_instance')
    def test_get_program_requirements(self, mock_get_course_scraper, mock_get_ecp_core, mock_get_gen_ed, mock_get_links):
        """Test getting program requirements for Computer Science ECP"""
        # Setup mocks
        mock_ecp_core_pool = CoursePool(
            _id="COMP_ECP_Core",
            name="ECP Core",
            creditsRequired=9.0,
            courses=["MATH 200", "ENGL 212"]
        )
        mock_get_ecp_core.return_value = mock_ecp_core_pool
        
        mock_gen_ed_pool = CoursePool(
            _id="ECP_General Education",
            name="ECP General Education",
            creditsRequired=6.0,
            courses=["ANTH 101"]
        )
        mock_get_gen_ed.return_value = mock_gen_ed_pool
        
        # Mock exclusion list
        mock_get_links.return_value = []
        
        # Mock course scraper
        mock_course_scraper = MagicMock()
        mock_course_scraper.get_courses_by_subjects.side_effect = [
            # For BCompSc electives (excluding Gina Cody subjects)
            ["ANTH 101", "ARTE 201", "ECON 201"],
            # For Computation Arts electives (excluding Gina Cody + Design/Comp Art)
            ["ANTH 101", "ECON 201",],
            # For Data Science electives (excluding Gina Cody + Math/Stat)
            ["ANTH 101", "ARTE 201"]
        ]
        mock_get_course_scraper.return_value = mock_course_scraper
        
        scraper = CompEcpDegreeScraper("Extended Credit Program - Computer Science", "COMP_ECP", "http://test.com")
        scraper._get_program_requirements()
        
        assert scraper.program_requirements is not None
        assert scraper.program_requirements.degree.name == "Extended Credit Program - Computer Science"
        assert abs(scraper.program_requirements.degree.totalCredits - 30.0) < 1e-8
        assert scraper.program_requirements.degree.degreeType == "ECP"
        
        # Should have 5 course pools: ECP Core, Gen Ed, BCompSc Electives, Comp Arts Electives, Data Science Electives
        assert len(scraper.program_requirements.coursePools) == 5
        
        pool_names = [pool.name for pool in scraper.program_requirements.coursePools]
        assert "ECP Core" in pool_names
        assert "ECP General Education" in pool_names
        assert "ECP Electives: BCompSc (other than Joint Majors)" in pool_names
        assert "ECP Electives: Joint Major in Computation Arts and Computer Science" in pool_names
        assert "ECP Electives: Joint Major in Data Science" in pool_names
        
        # Check that exclusions are properly applied
        bcompsc_pool = next(pool for pool in scraper.program_requirements.coursePools 
                          if pool.name == "ECP Electives: BCompSc (other than Joint Majors)")
        assert "ANTH 101" in bcompsc_pool.courses
        assert "ARTE 201" in bcompsc_pool.courses
        assert "ECON 201" in bcompsc_pool.courses

    def test_handle_special_cases(self):
        """Test that computer science ECP has no special cases"""
        scraper = CompEcpDegreeScraper("Extended Credit Program - Computer Science", "COMP_ECP", "http://test.com")
        # Should not raise any exceptions
        scraper._handle_special_cases()


class TestCoopDegreeScraper:
    @patch('scraper.ecp_coop_degree_scraper.get_course_scraper_instance')
    def test_get_program_requirements(self, mock_get_course_scraper):
        """Test getting program requirements for Co-op program"""
        mock_course_scraper = MagicMock()
        mock_course_scraper.get_courses_by_subjects.return_value = [
            "CWT 290", "CWT 291", "CWT 390", "CWT 391", "CWT 490", "CWT 491", "CWT 400", "CWT 401"
        ]
        mock_get_course_scraper.return_value = mock_course_scraper
        
        scraper = CoopDegreeScraper("Co-op Program", "COOP", "http://test.com")
        scraper._get_program_requirements()
        
        assert scraper.program_requirements is not None
        assert scraper.program_requirements.degree.name == "Co-op Program"
        assert abs(scraper.program_requirements.degree.totalCredits - 0.0) < 1e-8
        assert scraper.program_requirements.degree.degreeType == "Co-op"
        
        # Should have 1 course pool: Co-op Work Terms
        assert len(scraper.program_requirements.coursePools) == 1
        
        coop_pool = scraper.program_requirements.coursePools[0]
        assert coop_pool.name == "Co-op Work Terms"
        assert abs(coop_pool.creditsRequired - 0.0) < 1e-8
        
        # Should include CWT courses but exclude CWT 400 and CWT 401
        assert "CWT 290" in coop_pool.courses
        assert "CWT 291" in coop_pool.courses
        assert "CWT 390" in coop_pool.courses
        assert "CWT 391" in coop_pool.courses
        assert "CWT 490" in coop_pool.courses
        assert "CWT 491" in coop_pool.courses
        assert "CWT 400" not in coop_pool.courses
        assert "CWT 401" not in coop_pool.courses

    def test_handle_special_cases(self):
        """Test that co-op program has no special cases"""
        scraper = CoopDegreeScraper("Co-op Program", "COOP", "http://test.com")
        # Should not raise any exceptions
        scraper._handle_special_cases()