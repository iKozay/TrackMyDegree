import os
import sys
import re

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from utils.bs4_utils import get_soup, get_all_links_from_div, extract_coursepool_and_required_credits, extract_coursepool_courses
from utils.parsing_utils import COURSE_REGEX, extract_name_and_credits
from utils.logging_utils import get_logger
from models import AnchorLink, CoursePool, DegreeScraperConfig, DegreeType, ProgramRequirements
from scraper.abstract_degree_scraper import AbstractDegreeScraper
from scraper.course_data_scraper import get_course_scraper_instance

class DegreeDataScraper():
    GINA_CODY_PROGRAMS_OFFERED_URL = "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-10-gina-cody-school-of-engineering-and-computer-science.html#9919"

    def __init__(self):
        self.logger = get_logger("DegreeDataScraper")
        self.degree_scraper_config: list[DegreeScraperConfig] = [
            DegreeScraperConfig(long_name="BEng in Aerospace Engineering - Option A", marker="BEng in Aerospace Engineering", short_name="AERO", scraper_class=AeroDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Aerospace Engineering - Option B", marker="BEng in Aerospace Engineering", short_name="AERO", scraper_class=AeroDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Aerospace Engineering - Option C", marker="BEng in Aerospace Engineering", short_name="AERO", scraper_class=AeroDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Building Engineering", short_name="BLDG", scraper_class=BldgDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Chemical Engineering", short_name="CHEM", scraper_class=ChemDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Civil Engineering", short_name="CIVL", scraper_class=CiviDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Computer Engineering", short_name="COEN", scraper_class=CoenDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Electrical Engineering", short_name="ELEC", scraper_class=ElecDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Industrial Engineering", short_name="INDU", scraper_class=InduDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Mechanical Engineering", short_name="MECH", scraper_class=MechDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Software Engineering", short_name="SOEN", scraper_class=SoenDegreeScraper),
            DegreeScraperConfig(long_name="BCompSc in Computer Science", short_name="COMP", scraper_class=CompDegreeScraper),
            DegreeScraperConfig(long_name="Extended Credit Program - Engineering", marker="Extended Credit Program", short_name="ENGR_ECP", scraper_class=EngrEcpDegreeScraper),
            DegreeScraperConfig(long_name="Extended Credit Program - Computer Science", marker="Section 71.70.3 Extended Credit Program", short_name="COMP_ECP", scraper_class=CompEcpDegreeScraper),
            DegreeScraperConfig(long_name="Co-op Program", short_name="COOP", scraper_class=CoopDegreeScraper),
            #TODO: add Computer Science and Health & Life Science
            #TODO: add Computer Science and Data Science
            #TODO: add Computer Science and Computer Arts
        ]
        self._init_scrapers()

    def _init_scrapers(self) -> dict[str, AbstractDegreeScraper]:
        # Get degree programs
        degree_links = get_all_links_from_div(self.GINA_CODY_PROGRAMS_OFFERED_URL, ["content-main"], exclude_regex=COURSE_REGEX)
        degree_links.append(AnchorLink(text="Co-op Program", url=""))
        self.degree_scrapers = {}
        for config in self.degree_scraper_config:
            degree_link = next((link for link in degree_links if config.marker in link.text), None)
            if degree_link:
                self.degree_scrapers[config.long_name] = config.scraper_class(config.long_name, config.short_name, degree_link.url)
            else:
                self.logger.warning(f"Warning: No link found for degree '{config.long_name}' with marker '{config.marker}' in the Gina Cody programs page")

    def get_degree_names(self) -> list[str]:
        return list(self.degree_scrapers.keys())
    
    def scrape_degree_by_name(self, degree_name: str) -> ProgramRequirements:
        scraper = self.degree_scrapers.get(degree_name)
        if not scraper:
            raise ValueError(f"Degree scraper for '{degree_name}' not found.")
        return scraper.scrape_degree()
    
    def scrape_all_degrees(self) -> list[ProgramRequirements]:
        responses = []
        for scraper in self.degree_scrapers.values():
            self.logger.info(f"Scraping degree: {scraper.degree_name}")
            response = scraper.scrape_degree()
            responses.append(response)
        return responses

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