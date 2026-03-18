# from unittest.mock import patch, MagicMock
# import sys
# import os

# sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# from scraper.ecp_coop_degree_scraper import EcpDegreeScraper, EngrEcpDegreeScraper, CompEcpDegreeScraper, CompHlsEcpDegreeScraper, CoopDegreeScraper
# from models import ECPDegreeIDs, CoursePool, AnchorLink, DegreeType


# class TestEcpDegreeScraper:
    
#     @patch('scraper.ecp_coop_degree_scraper.get_all_links_from_div')
#     def test_get_ecp_core(self, mock_get_links):
#         """Test getting ECP core course pool"""
#         mock_get_links.return_value = [
#             AnchorLink(text="MATH 200", url="http://test.com"),
#             AnchorLink(text="MATH 201", url="http://test.com"),
#             AnchorLink(text="ENGL 212", url="http://test.com")
#         ]
        
#         scraper = EcpDegreeScraper("Extended Credit Program - Engineering", "ENGR_ECP", None, "http://test.com")
#         result = scraper.get_ecp_core(credits_required=18.0)
        
#         assert result.name == "ECP Core"
#         assert abs(result.creditsRequired - 18.0) < 1e-8
#         assert "MATH 200" in result.courses
#         assert "MATH 201" in result.courses
#         assert "ENGL 212" in result.courses
#         assert result._id == "ENGR_ECP_Core"
    
#     @patch('scraper.ecp_coop_degree_scraper.GinaCodyDegreeScraper._get_general_education_pool')
#     def test_get_general_education_pool(self, mock_super_get_gen_ed):
#         """Test getting ECP general education pool"""
#         mock_base_pool = CoursePool(
#             _id="General Education Humanities and Social Sciences Electives",
#             name="General Education Humanities and Social Sciences Electives",
#             creditsRequired=6.0,
#             courses=["ANTH 101", "PHIL 212"]
#         )
#         mock_super_get_gen_ed.return_value = mock_base_pool
        
#         scraper = EcpDegreeScraper("Extended Credit Program - Engineering", "ENGR_ECP", None, "http://test.com")
#         result = scraper._get_general_education_pool(credits_required=6.0)
        
#         assert result.name == "ECP General Education Humanities and Social Sciences Electives"
#         assert result._id == "ECP_General Education Humanities and Social Sciences Electives"
#         assert abs(result.creditsRequired - 6.0) < 1e-8
#         assert result.courses == ["ANTH 101", "PHIL 212"]


# class TestEngrEcpDegreeScraper:
#     @patch('scraper.ecp_coop_degree_scraper.get_all_links_from_div')
#     @patch('scraper.ecp_coop_degree_scraper.EngrEcpDegreeScraper._get_general_education_pool')
#     def test_get_program_requirements(self, mock_get_gen_ed, mock_get_links):
#         """Test getting program requirements for Engineering ECP"""
#         # Mock ECP Core courses
#         mock_get_links.side_effect = [
#             # First call for ECP Core
#             [AnchorLink(text="MATH 200", url="http://test.com"), 
#              AnchorLink(text="ENGL 212", url="http://test.com")],
#             # Second call for Natural Science Electives
#             [AnchorLink(text="PHYS 204", url="http://test.com"),
#              AnchorLink(text="CHEM 205", url="http://test.com")]
#         ]
        
#         # Mock general education pool
#         mock_gen_ed_pool = CoursePool(
#             _id="ECP_General Education",
#             name="ECP General Education",
#             creditsRequired=6.0,
#             courses=["ANTH 101"]
#         )
#         mock_get_gen_ed.return_value = mock_gen_ed_pool
        
#         scraper = EngrEcpDegreeScraper("Extended Credit Program - Engineering", "ENGR_ECP", None, "http://test.com")
#         scraper._get_program_requirements()
        
#         assert scraper.program_requirements is not None
#         assert scraper.program_requirements.degree.name == "Extended Credit Program - Engineering"
#         assert abs(scraper.program_requirements.degree.totalCredits - 30.0) < 1e-8
#         assert scraper.program_requirements.degree.degreeType == "ECP"
        
#         # Should have 3 course pools: ECP Core, Natural Science Electives, General Education
#         assert len(scraper.program_requirements.coursePools) == 3
        
#         pool_names = [pool.name for pool in scraper.program_requirements.coursePools]
#         assert "ECP Core" in pool_names
#         assert "ECP Natural Science Electives" in pool_names
#         assert "ECP General Education" in pool_names

#     def test_handle_special_cases(self):
#         """Test that engineering ECP has no special cases"""
#         scraper = EngrEcpDegreeScraper("Extended Credit Program - Engineering", "ENGR_ECP", None, "http://test.com")
#         # Should not raise any exceptions
#         scraper._handle_special_cases()


# class TestCompEcpDegreeScraper:

#     def _make_mocks(self, mock_get_ecp_core, mock_get_gen_ed, mock_get_links, elective_courses):
#         mock_get_ecp_core.return_value = CoursePool(
#             _id="COMP_ECP_Core",
#             name="ECP Core",
#             creditsRequired=9.0,
#             courses=["MATH 200", "ENGL 212"]
#         )
#         mock_get_gen_ed.return_value = CoursePool(
#             _id="ECP_General Education",
#             name="ECP General Education",
#             creditsRequired=6.0,
#             courses=["ANTH 101"]
#         )
#         mock_get_links.return_value = []
#         mock_course_scraper = MagicMock()
#         mock_course_scraper.get_courses_by_subjects.return_value = elective_courses
#         return mock_course_scraper

#     @patch('scraper.ecp_coop_degree_scraper.get_all_links_from_div')
#     @patch('scraper.ecp_coop_degree_scraper.CompEcpDegreeScraper._get_general_education_pool')
#     @patch('scraper.ecp_coop_degree_scraper.CompEcpDegreeScraper.get_ecp_core')
#     @patch('scraper.ecp_coop_degree_scraper.get_course_scraper_instance')
#     def test_get_program_requirements_bcompsc(self, mock_get_course_scraper, mock_get_ecp_core, mock_get_gen_ed, mock_get_links):
#         """Test getting program requirements for BCompSc ECP"""
#         mock_course_scraper = self._make_mocks(mock_get_ecp_core, mock_get_gen_ed, mock_get_links,
#                                                ["ANTH 101", "ARTE 201", "ECON 201"])
#         mock_get_course_scraper.return_value = mock_course_scraper

#         scraper = CompEcpDegreeScraper("Extended Credit Program - BCompSc", ECPDegreeIDs.COMP_ECP_ID, None, "http://test.com")
#         scraper._get_program_requirements()

#         assert scraper.program_requirements is not None
#         assert scraper.program_requirements.degree.name == "Extended Credit Program - BCompSc"
#         assert abs(scraper.program_requirements.degree.totalCredits - 30.0) < 1e-8
#         assert scraper.program_requirements.degree.degreeType == "ECP"

#         # Should have 3 pools: ECP Core, Gen Ed, BCompSc Electives
#         assert len(scraper.program_requirements.coursePools) == 3

#         pool_names = [pool.name for pool in scraper.program_requirements.coursePools]
#         assert "ECP Core" in pool_names
#         assert "ECP General Education" in pool_names
#         assert "ECP Electives: BCompSc (other than Joint Majors)" in pool_names

#         bcompsc_pool = next(p for p in scraper.program_requirements.coursePools
#                             if p.name == "ECP Electives: BCompSc (other than Joint Majors)")
#         assert "ANTH 101" in bcompsc_pool.courses
#         assert "ARTE 201" in bcompsc_pool.courses
#         assert "ECON 201" in bcompsc_pool.courses

#     @patch('scraper.ecp_coop_degree_scraper.get_all_links_from_div')
#     @patch('scraper.ecp_coop_degree_scraper.CompEcpDegreeScraper._get_general_education_pool')
#     @patch('scraper.ecp_coop_degree_scraper.CompEcpDegreeScraper.get_ecp_core')
#     @patch('scraper.ecp_coop_degree_scraper.get_course_scraper_instance')
#     def test_get_program_requirements_comp_arts(self, mock_get_course_scraper, mock_get_ecp_core, mock_get_gen_ed, mock_get_links):
#         """Test getting program requirements for Computation Arts and Computer Science ECP"""
#         mock_course_scraper = self._make_mocks(mock_get_ecp_core, mock_get_gen_ed, mock_get_links,
#                                                ["ANTH 101", "ECON 201"])
#         mock_get_course_scraper.return_value = mock_course_scraper

#         scraper = CompEcpDegreeScraper("Extended Credit Program - Computation Arts and Computer Science",
#                                        ECPDegreeIDs.COMP_CA_ECP_ID, None, "http://test.com")
#         scraper._get_program_requirements()

#         assert scraper.program_requirements is not None
#         assert scraper.program_requirements.degree.degreeType == "ECP"

#         # Should have 3 pools: ECP Core, Gen Ed, Comp Arts Electives
#         assert len(scraper.program_requirements.coursePools) == 3

#         pool_names = [pool.name for pool in scraper.program_requirements.coursePools]
#         assert "ECP Core" in pool_names
#         assert "ECP General Education" in pool_names
#         assert "ECP Electives: Joint Major in Computation Arts and Computer Science" in pool_names

#         comp_arts_pool = next(p for p in scraper.program_requirements.coursePools
#                               if p.name == "ECP Electives: Joint Major in Computation Arts and Computer Science")
#         assert "ANTH 101" in comp_arts_pool.courses
#         assert "ECON 201" in comp_arts_pool.courses

#     @patch('scraper.ecp_coop_degree_scraper.get_all_links_from_div')
#     @patch('scraper.ecp_coop_degree_scraper.CompEcpDegreeScraper._get_general_education_pool')
#     @patch('scraper.ecp_coop_degree_scraper.CompEcpDegreeScraper.get_ecp_core')
#     @patch('scraper.ecp_coop_degree_scraper.get_course_scraper_instance')
#     def test_get_program_requirements_data_science(self, mock_get_course_scraper, mock_get_ecp_core, mock_get_gen_ed, mock_get_links):
#         """Test getting program requirements for Data Science ECP"""
#         mock_course_scraper = self._make_mocks(mock_get_ecp_core, mock_get_gen_ed, mock_get_links,
#                                                ["ANTH 101", "ARTE 201"])
#         mock_get_course_scraper.return_value = mock_course_scraper

#         scraper = CompEcpDegreeScraper("Extended Credit Program - Data Science",
#                                        ECPDegreeIDs.COMP_DS_ECP_ID, None, "http://test.com")
#         scraper._get_program_requirements()

#         assert scraper.program_requirements is not None
#         assert scraper.program_requirements.degree.degreeType == "ECP"

#         # Should have 3 pools: ECP Core, Gen Ed, Data Science Electives
#         assert len(scraper.program_requirements.coursePools) == 3

#         pool_names = [pool.name for pool in scraper.program_requirements.coursePools]
#         assert "ECP Core" in pool_names
#         assert "ECP General Education" in pool_names
#         assert "ECP Electives: Joint Major in Data Science" in pool_names

#         ds_pool = next(p for p in scraper.program_requirements.coursePools
#                        if p.name == "ECP Electives: Joint Major in Data Science")
#         assert "ANTH 101" in ds_pool.courses
#         assert "ARTE 201" in ds_pool.courses

# class TestCompHlsEcpDegreeScraper:
#     @patch('scraper.ecp_coop_degree_scraper.get_all_links_from_div')
#     def test_get_ecp_core(self, mock_get_links):
#         """Test getting ECP core for Health and Life Sciences"""
#         mock_get_links.return_value = [
#             AnchorLink(text="BIOL 201", url="http://test.com"),
#             AnchorLink(text="CHEM 205", url="http://test.com"),
#             AnchorLink(text="MATH 203", url="http://test.com")
#         ]
        
#         scraper = CompHlsEcpDegreeScraper("Extended Credit Program - Health and Life Sciences", "HLS_ECP", None, "http://test.com")
#         result = scraper.get_ecp_core(credits_required=30.0)
        
#         assert result.name == "ECP Core"
#         assert abs(result.creditsRequired - 30.0) < 1e-8
#         assert "BIOL 201" in result.courses
#         assert "CHEM 205" in result.courses
#         assert "MATH 203" in result.courses
#         assert result._id == "HLS_ECP_Core"
        
#         # Verify the correct search text was used
#         mock_get_links.assert_called_once_with(
#             "http://test.com", 
#             ["defined-group"], 
#             "Extended Credit Program: Health and Life Sciences",
#             include_regex=mock_get_links.call_args[1]['include_regex']
#         )

#     @patch('scraper.ecp_coop_degree_scraper.CompHlsEcpDegreeScraper.get_ecp_core')
#     def test_get_program_requirements(self, mock_get_ecp_core):
#         """Test getting program requirements for Health and Life Sciences ECP"""
#         # Mock ECP Core
#         mock_ecp_core_pool = CoursePool(
#             _id="HLS_ECP_Core",
#             name="ECP Core",
#             creditsRequired=30.0,
#             courses=["BIOL 201", "CHEM 205", "MATH 203"]
#         )
#         mock_get_ecp_core.return_value = mock_ecp_core_pool
        
#         scraper = CompHlsEcpDegreeScraper("Extended Credit Program - Health and Life Sciences", "HLS_ECP", None, "http://test.com")
#         scraper._get_program_requirements()
        
#         assert scraper.program_requirements is not None
#         assert scraper.program_requirements.degree.name == "Extended Credit Program - Health and Life Sciences"
#         assert abs(scraper.program_requirements.degree.totalCredits - 30.0) < 1e-8
#         assert scraper.program_requirements.degree.degreeType == "ECP"
        
#         # Should have 1 course pool: ECP Core
#         assert len(scraper.program_requirements.coursePools) == 1
        
#         ecp_core_pool = scraper.program_requirements.coursePools[0]
#         assert ecp_core_pool.name == "ECP Core"
#         assert abs(ecp_core_pool.creditsRequired - 30.0) < 1e-8
#         assert "BIOL 201" in ecp_core_pool.courses
#         assert "CHEM 205" in ecp_core_pool.courses
#         assert "MATH 203" in ecp_core_pool.courses
        
#         # Verify get_ecp_core was called with correct credits
#         mock_get_ecp_core.assert_called_once_with(credits_required=30.0)

# class TestCoopDegreeScraper:
#     @patch('scraper.ecp_coop_degree_scraper.get_course_scraper_instance')
#     def test_get_program_requirements(self, mock_get_course_scraper):
#         """Test getting program requirements for Co-op program"""
#         mock_course_scraper = MagicMock()
#         mock_course_scraper.get_courses_by_subjects.return_value = [
#             "CWT 290", "CWT 291", "CWT 390", "CWT 391", "CWT 490", "CWT 491", "CWT 400", "CWT 401"
#         ]
#         mock_get_course_scraper.return_value = mock_course_scraper
        
#         scraper = CoopDegreeScraper("Co-op Program", "COOP", None, "http://test.com")
#         scraper._get_program_requirements()
        
#         assert scraper.program_requirements is not None
#         assert scraper.program_requirements.degree.name == "Co-op Program"
#         assert abs(scraper.program_requirements.degree.totalCredits - 0.0) < 1e-8
#         assert scraper.program_requirements.degree.degreeType == "Co-op"
        
#         # Should have 1 course pool: Co-op Work Terms
#         assert len(scraper.program_requirements.coursePools) == 1
        
#         coop_pool = scraper.program_requirements.coursePools[0]
#         assert coop_pool.name == "Co-op Work Terms"
#         assert abs(coop_pool.creditsRequired - 0.0) < 1e-8
        
#         # Should include CWT courses but exclude CWT 400 and CWT 401
#         assert "CWT 290" in coop_pool.courses
#         assert "CWT 291" in coop_pool.courses
#         assert "CWT 390" in coop_pool.courses
#         assert "CWT 391" in coop_pool.courses
#         assert "CWT 490" in coop_pool.courses
#         assert "CWT 491" in coop_pool.courses
#         assert "CWT 400" not in coop_pool.courses
#         assert "CWT 401" not in coop_pool.courses

#     def test_handle_special_cases(self):
#         """Test that co-op program has no special cases"""
#         scraper = CoopDegreeScraper("Co-op Program", "COOP", None, "http://test.com")
#         # Should not raise any exceptions
#         scraper._handle_special_cases()