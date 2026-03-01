import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scraper.gina_cody_degree_scraper import GinaCodyDegreeScraper
from scraper.course_data_scraper import get_course_scraper_instance
from models import CoursePool, DegreeType
from utils.bs4_utils import get_all_links_from_div
from utils.parsing_utils import COURSE_REGEX

class EcpDegreeScraper(GinaCodyDegreeScraper):
    def get_ecp_core(self, credits_required: float) -> CoursePool:
        ecp_core_pool_courses = get_all_links_from_div(self.requirements_url, ["defined-group"], "Extended Credit Program", include_regex=COURSE_REGEX)
        ecp_core_pool = CoursePool(
            _id=f"{self.degree_short_name}_Core",
            name="ECP Core",
            creditsRequired=credits_required,
            courses=[course.text for course in ecp_core_pool_courses]
        )
        return ecp_core_pool
    def _get_general_education_pool(self, credits_required: float = 6.0) -> CoursePool:
        pool = super()._get_general_education_pool(credits_required)
        pool._id = f"ECP_{pool._id}"
        pool.name = f"ECP {pool.name}"
        return pool

class EngrEcpDegreeScraper(EcpDegreeScraper):
    def _get_program_requirements(self) -> None:
        program_name, total_credits = self.degree_name, 30.0

        # Extract ECP Core
        ecp_core_pool = self.get_ecp_core(credits_required=18.0)
        # Extract Natural Science Electives
        natural_science_electives_courses = get_all_links_from_div(self.requirements_url, ["defined-group"], "Natural Science Electives", include_regex=COURSE_REGEX)
        natural_science_electives_pool = CoursePool(
            _id=f"{self.degree_short_name}_Natural Science Electives",
            name="ECP Natural Science Electives",
            creditsRequired=6.0,
            courses=[course.text for course in natural_science_electives_courses]
        )

        gen_education_electives_pool = self._get_general_education_pool(credits_required=6.0)

        course_pool_objects = [ecp_core_pool, natural_science_electives_pool, gen_education_electives_pool]

        self._set_program_requirements(program_name, total_credits, DegreeType.ECP, course_pool_objects)

    
    def _handle_special_cases(self):
        # No special cases for Engr ECP
        pass

class CompEcpDegreeScraper(EcpDegreeScraper):
    def _get_program_requirements(self) -> None:
        program_name, total_credits = self.degree_name, 30.0

        # Extract ECP Core
        ecp_core_pool = self.get_ecp_core(credits_required=9.0)

        gen_education_electives_pool = self._get_general_education_pool(credits_required=6.0)

        ecp_electives_exclusion_list = get_all_links_from_div(self.requirements_url, ["defined-group"], "ECP Electives Exclusion List", include_regex=COURSE_REGEX)
        gina_cody_exlcuded_subjects = ["ENCS", "ENGR", "AERO", "BCEE", "BLDG", "CIVI", "COEN", "ELEC", "IADI", "INDU", "MECH", "MIAE", "COMP", "SOEN"]
        design_and_comp_art_excluded_subjects = ["DART", "CART"]
        math_and_stat_excluded_subjects = ["ACTU", "MACF", "MATH", "MAST", "STAT"]

        # Extract ECP Electives: BCompSc (other than Joint Majors)
        electives_bcompsc_courses: list[str] = get_course_scraper_instance().get_courses_by_subjects(gina_cody_exlcuded_subjects, inclusive=False)
        electives_bcompsc_courses = [course for course in electives_bcompsc_courses if course not in ecp_electives_exclusion_list]
        electives_bcompsc_pool = CoursePool(
            _id=f"{self.degree_short_name} Electives: BCompSc (other than Joint Majors)",
            name="ECP Electives: BCompSc (other than Joint Majors)",
            creditsRequired=15.0,
            courses=electives_bcompsc_courses
        )

        # Extract ECP Electives: Joint Major in Computation Arts and Computer Science
        electives_comp_arts_courses: list[str] = get_course_scraper_instance().get_courses_by_subjects((gina_cody_exlcuded_subjects + design_and_comp_art_excluded_subjects), inclusive=False)
        electives_comp_arts_courses = [course for course in electives_comp_arts_courses if course not in ecp_electives_exclusion_list]
        electives_comp_arts_pool = CoursePool(
            _id=f"{self.degree_short_name} Electives: Joint Major in Computation Arts and Computer Science",
            name="ECP Electives: Joint Major in Computation Arts and Computer Science",
            creditsRequired=15.0,
            courses=electives_comp_arts_courses
        )

        # Extract ECP Electives: Joint Major in Data Science
        electives_data_science_courses: list[str] = get_course_scraper_instance().get_courses_by_subjects((gina_cody_exlcuded_subjects + math_and_stat_excluded_subjects), inclusive=False)
        electives_data_science_courses = [course for course in electives_data_science_courses if course not in ecp_electives_exclusion_list]
        electives_data_science_pool = CoursePool(
            _id=f"{self.degree_short_name} Electives: Joint Major in Data Science",
            name="ECP Electives: Joint Major in Data Science",
            creditsRequired=15.0,
            courses=electives_data_science_courses
        )

        course_pool_objects = [ecp_core_pool, gen_education_electives_pool, electives_bcompsc_pool, electives_comp_arts_pool, electives_data_science_pool]

        self._set_program_requirements(program_name, total_credits, DegreeType.ECP, course_pool_objects)

    def _handle_special_cases(self):
        # No special cases for Engr ECP
        pass

class CoopDegreeScraper(GinaCodyDegreeScraper):
    def _get_program_requirements(self) -> None:
        program_name, total_credits = self.degree_name, 0.0

        cwt_courses = get_course_scraper_instance().get_courses_by_subjects(["CWT"])
        cwt_courses.remove("CWT 400")
        cwt_courses.remove("CWT 401")

        coop_course_pool = CoursePool(
            _id=f"{self.degree_short_name}_Co-op Work Terms",
            name="Co-op Work Terms",
            creditsRequired=0.0,
            courses=cwt_courses
        )
        self._set_program_requirements(program_name, total_credits, DegreeType.COOP, [coop_course_pool])

    def _handle_special_cases(self) -> None:
        # No special cases for Coop
        pass