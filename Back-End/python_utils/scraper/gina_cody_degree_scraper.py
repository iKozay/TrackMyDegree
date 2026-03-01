import os
import sys
import re

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from utils.bs4_utils import get_soup, get_all_links_from_div, extract_coursepool_and_required_credits, extract_coursepool_courses
from utils.parsing_utils import COURSE_REGEX, extract_name_and_credits
from models import AnchorLink, CoursePool, DegreeType
from scraper.abstract_degree_scraper import AbstractDegreeScraper
from scraper.course_data_scraper import get_course_scraper_instance

class GinaCodyDegreeScraper(AbstractDegreeScraper):
    ENGINEERING_CORE_COURSES_URL = "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-20-beng/section-71-20-5-degree-requirements.html#12215"
    ENGINEERING_CORE = "Engineering Core"
    GENERAL_ELECTIVES = "General Education Humanities and Social Sciences Electives"
    ELEC_273 = "ELEC 273"
    ELEC_275 = "ELEC 275"
    
    def _get_program_requirements(self) -> None:
        soup = get_soup(self.requirements_url)

        program_node = self._get_program_node(soup)

        # Extract program name and total credits
        title_element = program_node.find("h3")
        program_name, total_credits = extract_name_and_credits(title_element)
        program_name = self.degree_name

        # Extract course pools without courses
        course_pool_objects = self._get_course_pools_without_courses(program_node)

        self._set_program_requirements(program_name, total_credits, DegreeType.STANDALONE, course_pool_objects)

        # Extract courses for each course pool
        failed_course_pools = self._extract_course_pool_courses(course_pool_objects)
        self._handle_failed_course_pools(failed_course_pools)
    
    def _get_program_node(self, soup):
        program_node = soup.find("div", class_="program-node", attrs={"title": self.degree_name})
        if not program_node:
            raise ValueError(f"Program node for '{self.degree_name}' not found in the degree requirements page.")
        return program_node

    def _get_course_pools_without_courses(self, program_node) -> list[CoursePool]:
        # Extract coursepools
        table_element = program_node.find("table")
        coursepools = extract_coursepool_and_required_credits(self.requirements_url, table_element)

        # Create CoursePool objects
        course_pool_objects = []
        
        for pool in coursepools:
            pool_anchor, pool_credits = pool
            pool_id = f"{self.degree_short_name}_{pool_anchor.text}"
            
            course_pool_objects.append(CoursePool(
                _id=pool_id,
                name=pool_anchor.text,
                creditsRequired=pool_credits,
                courses=[]
            ))
        
        return course_pool_objects
    
    def _extract_course_pool_courses(self, course_pools: list[CoursePool]) -> list[CoursePool]:
        failed_course_pools = []
        for pool in course_pools:
            success = extract_coursepool_courses(self.requirements_url, pool)
            if not success or not pool.courses:
                failed_course_pools.append(pool)
        return failed_course_pools

    def _handle_failed_course_pools(self, failed_pools: list[CoursePool]):
        for pool in failed_pools:
            if self.ENGINEERING_CORE in pool.name:
                self._handle_engineering_core(pool)
            else:
                self.logger.warning(f"Warning: No special handling defined for failed course pool '{pool.name}' in '{self.program_requirements.degree.name}' degree")
    
    def _handle_engineering_core(self, pool: CoursePool):
        courses_list = get_all_links_from_div(self.ENGINEERING_CORE_COURSES_URL, ["formatted-course"], include_regex=COURSE_REGEX)
        for course in courses_list:
            pool.courses.append(course.text)
        pool.creditsRequired -= 3
        # Creating General Education Humanities and Social Sciences Electives as separate pool
        gen_education_electives_pool = self._get_general_education_pool()
        self.program_requirements.coursePools.append(gen_education_electives_pool)
        self.program_requirements.degree.coursePools.append(gen_education_electives_pool._id)

    def _get_general_education_pool(self, credits_required: float = 3.0) -> CoursePool:
        allowed_course_subjects = ["ANTH", "FPST", "HIST", "PHIL", "RELI", "SOCI", "THEO", "WSDB", "ARTE", "ARTH", "JHIS", "MHIS"]
        other_allowed_courses = ["COMS 360", "EDUC 230", "ENCS 483", "ENGL 224", "ENGL 233", "GEOG 220", "INST 250", "LING 222", "LING 300", "URBS 230"]
        excluded_courses = ["ANTH 315", "PHIL 214", "PHIL 316", "PHIL 317", "SOCI 212", "SOCI 213", "SOCI 310"]
        general_education_courses = get_course_scraper_instance().get_courses_by_subjects(allowed_course_subjects)

        # Remove excluded courses
        general_education_courses = [course for course in general_education_courses if course not in excluded_courses]
        # Add other allowed courses (if not already present)
        for course_id in other_allowed_courses:
            if course_id not in general_education_courses:
                general_education_courses.append(course_id)

        return CoursePool(
            _id=self.GENERAL_ELECTIVES,
            name=self.GENERAL_ELECTIVES,
            creditsRequired=credits_required,
            courses=general_education_courses
        )

    def _handle_special_cases(self):
        # To be implemented by child classes for degree-specific special case handling
        pass

class AeroDegreeScraper(GinaCodyDegreeScraper):
    def __init__(self, degree_name, degree_short_name, requirements_url):
        super().__init__(degree_name, degree_short_name, requirements_url)
        self.degree_name_without_option, self.option_name = degree_name.split(" - ")

    def _get_program_node(self, soup):
        program_node = soup.find("div", class_="program-node", attrs={"title": self.degree_name_without_option})
        if not program_node:
            raise ValueError(f"Program node for '{self.degree_name}' not found in the degree requirements page.")
        return program_node

    def _get_course_pools_without_courses(self, program_node) -> list[CoursePool]:
        # Extract coursepools
        table_element = program_node.find("table")
        coursepools = extract_coursepool_and_required_credits(self.requirements_url, table_element)

        # Remove all option course pools but keep the total credits of the course pool
        pool_credits = self._remove_option_course_pools(coursepools)

        # Find the correct option course pools for current option
        soup = get_soup(self.requirements_url)
        option_divs = soup.find_all("div", class_="defined-group", attrs={"title": lambda t: t and self.option_name in t})
        for option_div in option_divs:
            # Match pattern: "{option_name} {anything} ({credits} credits)"
            # ex: Option A — Aerodynamics and Propulsion (54.75 credits)
            pattern = rf"{re.escape(self.option_name)}\s+.*?\s+\({pool_credits}\s+credits\)"
            h3_element = option_div.find("h3", string=lambda s: s and re.match(pattern, s.strip()))
            if h3_element:
                option_table = option_div.find("table")
                if option_table:
                    coursepools.extend(extract_coursepool_and_required_credits(self.requirements_url, option_table))
                    break

        # Create CoursePool objects
        course_pool_objects = []
        
        for pool in coursepools:
            pool_anchor, pool_credits = pool
            pool_id = f"{self.degree_short_name}_{pool_anchor.text}"
            
            course_pool_objects.append(CoursePool(
                _id=pool_id,
                name=pool_anchor.text,
                creditsRequired=pool_credits,
                courses=[]
            ))
        
        return course_pool_objects

    def _remove_option_course_pools(self, coursepools: list[tuple[AnchorLink, float]]) -> float:
        pools_to_remove = []
        pool_credits = 0
        for pool in coursepools:
            if "Option" in pool[0].text:
                pools_to_remove.append(pool)
                if pool_credits == 0:
                    pool_credits = pool[1]
        for pool in pools_to_remove:
            coursepools.remove(pool)
        return pool_credits

    def _handle_special_cases(self):
        # Engineering Core:
        # - Aerospace Engineering students are not required to take ELEC 275‌ in their program
        self.remove_courses_from_pool(self.ENGINEERING_CORE, [self.ELEC_275])

class BldgDegreeScraper(GinaCodyDegreeScraper):
    def _handle_special_cases(self):
        # Engineering Core:
        # - Building Engineering students are not required to take ENGR 202‌ in their program.
        # - Students in BEng in Building Engineering‌ shall replace ENGR 392‌ with BLDG 482.
        self.remove_courses_from_pool(self.ENGINEERING_CORE, ["ENGR 202"])
        self.remove_courses_from_pool(self.ENGINEERING_CORE, ["ENGR 392"])
        self.add_courses_to_pool(self.ENGINEERING_CORE, ["BLDG 482"])

class ChemDegreeScraper(GinaCodyDegreeScraper):
    def _handle_special_cases(self):
        # Engineering Core:
        # - Students in the BEng in Chemical Engineering are not required to take ELEC 275‌ in their program
        self.remove_courses_from_pool(self.ENGINEERING_CORE, [self.ELEC_275])

class CiviDegreeScraper(GinaCodyDegreeScraper):
    def _handle_special_cases(self):
        # No special cases for Civil Engineering
        pass

class CoenDegreeScraper(GinaCodyDegreeScraper):
    def _handle_special_cases(self):
        # Engineering Core:
        # - Students in the BEng in Computer Engineering‌ and the BEng in Computer Engineering shall replace ELEC 275‌ with ELEC 273‌.
        self.remove_courses_from_pool(self.ENGINEERING_CORE, [self.ELEC_275])
        self.add_courses_to_pool(self.ENGINEERING_CORE, [self.ELEC_273])

class ElecDegreeScraper(GinaCodyDegreeScraper):
    def _handle_special_cases(self):
        # Engineering Core:
        # - Students in the BEng in Electrical Engineering‌ and the BEng in Computer Engineering shall replace ELEC 275‌ with ELEC 273‌.
        self.remove_courses_from_pool(self.ENGINEERING_CORE, [self.ELEC_275])
        self.add_courses_to_pool(self.ENGINEERING_CORE, [self.ELEC_273])

class InduDegreeScraper(GinaCodyDegreeScraper):
    def _handle_special_cases(self):
        # Engineering Core:
        # - Industrial Engineering students are not required to take ELEC 275‌ in their program
        # - Students in the BEng in Industrial Engineering‌ shall take ACCO 220‌ as their General Education elective
        self.remove_courses_from_pool(self.ENGINEERING_CORE, [self.ELEC_275])
        # Rename self.GENERAL_ELECTIVES to 'INDU_'+self.GENERAL_ELECTIVES to avoid conflicts with other degrees' general electives
        for pool in self.program_requirements.coursePools:
            if pool._id == self.GENERAL_ELECTIVES:
                pool._id = f"INDU_{self.GENERAL_ELECTIVES}"
                pool.courses = ["ACCO 220"]
        # Update the pool id in the degree's coursePools list as well
        for i, pool_id in enumerate(self.program_requirements.degree.coursePools):
            if pool_id == self.GENERAL_ELECTIVES:
                self.program_requirements.degree.coursePools[i] = f"INDU_{self.GENERAL_ELECTIVES}"
                break

class MechDegreeScraper(GinaCodyDegreeScraper):
    def _handle_special_cases(self):
        # Engineering Core:
        # - Mechanical Engineering students are not required to take ELEC 275‌ in their program
        self.remove_courses_from_pool(self.ENGINEERING_CORE, [self.ELEC_275])

class SoenDegreeScraper(GinaCodyDegreeScraper):
    def _handle_special_cases(self):
        # Engineering Core:
        # - Students in the BEng in Software Engineering‌ may replace ENGR 391‌ with COMP 361‌.
        self.add_courses_to_pool(self.ENGINEERING_CORE, ["COMP 361"])