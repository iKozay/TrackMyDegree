import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from utils.bs4_utils import get_all_links_from_div
from scraper.gina_cody_degree_scraper import GinaCodyDegreeScraper
from scraper.course_data_scraper import get_course_scraper_instance
from models import Constraint, ConstraintType, CoursePool, ECPDegreeIDs, ExcessCreditsOverflowParams, MaxCoursesFromSetParams, MaxCreditsFromSetParams
from utils.parsing_utils import COURSE_REGEX

class CompDegreeScraper(GinaCodyDegreeScraper):
    def _add_coursepool_rules(self):
        # Any credits exceeding the required number of Computer Science Elective credits will accrue towards the General Elective credits.
        # Credits exceeding the required number of Mathematics Elective credits will accrue towards the General Elective credits.
        computer_science_electives_pool = next((pool for pool in self.program_requirements.coursePools if pool.name.strip() == "Computer Science Electives"), None)
        math_electives_pool = next((pool for pool in self.program_requirements.coursePools if pool.name.strip() == "Mathematics Electives: BCompSc"), None)
        gen_electives_pool = next((pool for pool in self.program_requirements.coursePools if pool.name.strip() == "General Electives: BCompSc"), None)

        computer_science_electives_pool.rules.append(Constraint(
            type=ConstraintType.EXCESS_CREDITS_OVERFLOW,
            params=ExcessCreditsOverflowParams(
                targetPoolId=gen_electives_pool._id
            ),
            message="Any credits exceeding the required number of Computer Science Elective credits will accrue towards the General Elective credits."
        ))

        math_electives_pool.rules.append(Constraint(
            type=ConstraintType.EXCESS_CREDITS_OVERFLOW,
            params=ExcessCreditsOverflowParams(
                targetPoolId=gen_electives_pool._id
            ),
            message="Credits exceeding the required number of Mathematics Elective credits will accrue towards the General Elective credits."
        ))

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

class CompVariantDegreeScraper(GinaCodyDegreeScraper):
    def _get_program_node(self, soup):
        # First try without any replacement
        program_node = soup.find("div", class_="program-node", attrs={"title": self.degree_name})
        if program_node:
            return program_node

        # If not found, try with BCompSc replacement
        div_title = self.degree_name.replace("BCompSc", "").strip()
        program_node = soup.find("div", class_="program-node", attrs={"title": div_title})
        if program_node:
            return program_node

        # If still not found, raise error
        raise ValueError(f"Program node for '{self.degree_name}' not found in the degree requirements page.")

    def _handle_failed_course_pools(self, failed_pools):
        self.computer_science_requirements = CompDegreeScraper("BCompSc in Computer Science", "COMP", ECPDegreeIDs.COMP_ECP_ID, "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-70-department-of-computer-science-and-software-engineering/section-71-70-2-degree-requirements-bcompsc-.html").scrape_degree()
        comp_science_pool_names = [p.name for p in self.computer_science_requirements.coursePools]
        for pool in failed_pools:
            if pool.name in comp_science_pool_names:
                pool.courses = next((p.courses for p in self.computer_science_requirements.coursePools if pool.name == p.name), [])
            else:
                self.logger.error(f"Failed to extract courses for course pool: {pool.name} in {self.degree_name}")

class CompCaDegreeScraper(CompVariantDegreeScraper):
    def _add_coursepool_rules(self):
        # Computation Arts Core
        # Max 6 credits from 300 CART courses, max 6 credits from 400 CART courses, max 6 credits from DART courses
        comp_arts_core_pool = next((pool for pool in self.program_requirements.coursePools if pool.name.strip() == "Computation Arts Core"), None)

        cart_300_courses = [course for course in comp_arts_core_pool.courses if course.startswith("CART 3") and course != "CART 310"]
        cart_400_courses = [course for course in comp_arts_core_pool.courses if course.startswith("CART 4") and course != "CART 470"]
        dart_courses = [course for course in comp_arts_core_pool.courses if course.startswith("DART")]

        comp_arts_core_pool.rules.append(Constraint(
            type=ConstraintType.MAX_CREDITS_FROM_SET,
            params=MaxCreditsFromSetParams(
                courseList=cart_300_courses,
                maxCredits=6.0
            ),
            message="Students may take a maximum of 6 credits from 300-level CART courses (excluding CART 310) to satisfy the Computation Arts Core requirement."
        ))
        comp_arts_core_pool.rules.append(Constraint(
            type=ConstraintType.MAX_CREDITS_FROM_SET,
            params=MaxCreditsFromSetParams(
                courseList=cart_400_courses,
                maxCredits=9.0
            ),
            message="Students may take a maximum of 9 credits from 400-level CART courses (excluding CART 470) to satisfy the Computation Arts Core requirement."
        ))
        comp_arts_core_pool.rules.append(Constraint(
            type=ConstraintType.MAX_CREDITS_FROM_SET,
            params=MaxCreditsFromSetParams(
                courseList=dart_courses,
                maxCredits=6.0
            ),
            message="Students may take a maximum of 6 credits from DART courses to satisfy the Computation Arts Core requirement."
        ))

    def _handle_special_cases(self):
        # Get 300-level and 400-level CART courses as well as DART courses
        comp_arts_core_pool = next((pool for pool in self.program_requirements.coursePools if pool.name.strip() == "Computation Arts Core"), None)
        cart_dart_courses=get_course_scraper_instance().get_courses_by_subjects(["CART", "DART"])

        for course_id in cart_dart_courses:
            try:
                number = int(course_id.split()[1])
                if (course_id.startswith("CART") and (300 <= number)) or course_id.startswith("DART"):
                    if course_id not in comp_arts_core_pool.courses:
                        comp_arts_core_pool.courses.append(course_id)
            except Exception:
                self.logger.error(f"Failed to parse course number from course ID: {course_id}")
                continue
        
        # Get courses listed in the program node
        courses = get_all_links_from_div(self.requirements_url, ["program-node"], include_regex=COURSE_REGEX, require_exact_regex_match=True)
        # Extract course text from AnchorLink objects
        course_ids = [link.text for link in courses]
        other_courses_pool = CoursePool(_id=f"{self.degree_short_name}_Other Required Courses",name="Other Required Courses", courses=course_ids, creditsRequired=12.0)
        self.program_requirements.coursePools.append(other_courses_pool)
        self.program_requirements.degree.coursePools.append(other_courses_pool._id)

class CompDsDegreeScraper(CompVariantDegreeScraper):
    def _add_coursepool_rules(self):
        # Mathematics and Statistics Core: Joint Major in Data Science
        # MAST 334 may be replaced by COMP 361.
        math_stats_core_pool = next((pool for pool in self.program_requirements.coursePools if pool.name.strip() == "Mathematics and Statistics Core: Joint Major in Data Science"), None)
        math_stats_core_pool.rules.append(Constraint(
            type=ConstraintType.MAX_COURSES_FROM_SET,
            params=MaxCoursesFromSetParams(
                courseList=["MAST 334", "COMP 361"],
                maxCourses=1
            ),
            message="Students may replace MAST 334 with COMP 361."
        ))

    def _handle_special_cases(self):
        # COMP 233 must be replaced by MAST 221.
        computer_science_core_pool = next((pool for pool in self.program_requirements.coursePools if pool.name.strip() == "Computer Science Core"), None)
        self.remove_courses_from_pool(computer_science_core_pool.name, ["COMP 233"])
        self.add_courses_to_pool(computer_science_core_pool.name, ["MAST 221"])
        # Mathematics and Statistics Core: Joint Major in Data Science
        # MAST 334 may be replaced by COMP 361.
        math_stats_core_pool = next((pool for pool in self.program_requirements.coursePools if pool.name.strip() == "Mathematics and Statistics Core: Joint Major in Data Science"), None)
        self.add_courses_to_pool(math_stats_core_pool.name, ["MAST 334", "COMP 361"])

class CompHlsDegreeScraper(CompVariantDegreeScraper):
    def _handle_failed_course_pools(self, failed_pools):
        super()._handle_failed_course_pools(failed_pools)
        # Remove "COMP_HLS_Section 71.70.2 Degree Requirements" because it gets parsed incorrectly
        self.program_requirements.coursePools = [pool for pool in self.program_requirements.coursePools if pool._id.strip() != "COMP_HLS_Section 71.70.2 Degree Requirements"]
        self.program_requirements.degree.coursePools = [pool_id for pool_id in self.program_requirements.degree.coursePools if pool_id != "COMP_HLS_Section 71.70.2 Degree Requirements"]

    def _handle_special_cases(self):
        # No special cases for BCompSc in Health and Life Sciences
        pass