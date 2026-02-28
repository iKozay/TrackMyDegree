import os
import sys
import re

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from utils.bs4_utils import get_all_links_from_div
from utils.parsing_utils import COURSE_REGEX
from utils.logging_utils import get_logger
from models import AnchorLink, DegreeScraperConfig, ProgramRequirements
from scraper.abstract_degree_scraper import AbstractDegreeScraper
from scraper.gina_cody_degree_scraper import AeroDegreeScraper, BldgDegreeScraper, ChemDegreeScraper, CiviDegreeScraper, CoenDegreeScraper, ElecDegreeScraper, InduDegreeScraper, MechDegreeScraper, SoenDegreeScraper
from scraper.comp_sci_degree_scraper import CompDegreeScraper
from scraper.ecp_coop_degree_scraper import EngrEcpDegreeScraper, CompEcpDegreeScraper, CoopDegreeScraper

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