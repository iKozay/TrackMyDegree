import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scraper.gina_cody_degree_scraper import GinaCodyDegreeScraper
from scraper.course_data_scraper import get_course_scraper_instance
from models import CoursePool

class CompDegreeScraper(GinaCodyDegreeScraper):
    def _handle_special_cases(self):
        for pool in self.program_requirements.coursePools:
            if "Computer Science Electives" in pool.name:
                self._handle_computer_science_electives(pool)
            elif "General Electives: BCompSc" in pool.name:
                self._handle_computer_general_electives(pool)

    def _handle_computer_science_electives(self, computer_science_electives_pool: CoursePool):
        # Computer Science Electives must be chosen from the following:
        # - All COMP courses with numbers 325 or higher
        # - COMP and SOEN courses with numbers between 6000 and 6951 (Currently no such courses are scraped)
        # - Additional COMP electives (Already included in the pool)
        # - Computer Science Elective Course Groups
        additional_comp_electives_courses = get_course_scraper_instance().get_courses_by_subjects(["COMP"])
        additional_comp_electives_ids = []
        for course_id in additional_comp_electives_courses:
            try:
                number = int(course_id.split()[1])
                if number >= 325:
                    additional_comp_electives_ids.append(course_id)
            except Exception:
                self.logger.error(f"Failed to parse course number from course ID: {course_id}")
                continue
        computer_science_electives_pool.courses.extend(additional_comp_electives_ids)
        computer_science_electives_pool.courses = list(set(computer_science_electives_pool.courses))

    def _handle_computer_general_electives(self, comp_general_electives_pool: CoursePool):
        # General Electives must be chosen from the following lists:
        # 1. Computer Science Electives‌ (already in the degree requirements)
        # 2. Mathematics Electives: BCompSc‌ (already in the degree requirements)
        # 3. General Education Humanities and Social Sciences Electives (will be added using GinaCodyDegreeScraper)
        # 4. Also can't take courses from General Electives Exclusion List (shown below)
        general_electives_exclusion_list = ["BCEE 231", "BIOL 322", "BTM 380", "BTM 382", "CART 315", "COMM 215", "EXCI 322", "GEOG 264", "INTE 296", "MAST 221", "MAST 221", "MAST 333", "MIAE 215", "PHYS 235", "PHYS 236", "SOCI 212"]
        cs_electives_pool = next((pool for pool in self.program_requirements.coursePools if pool.name.strip() == "Computer Science Electives"), None)
        math_electives_pool = next((pool for pool in self.program_requirements.coursePools if pool.name.strip() == "Mathematics Electives: BCompSc"), None)
        gen_education_electives_pool = self._get_general_education_pool()

        allowed_courses = set()
        allowed_courses.update(cs_electives_pool.courses)
        allowed_courses.update(math_electives_pool.courses)
        allowed_courses.update(gen_education_electives_pool.courses)
        # Remove excluded courses
        for course in general_electives_exclusion_list:
            if course in allowed_courses:
                allowed_courses.remove(course)
        
        comp_general_electives_pool.courses = list(allowed_courses)
