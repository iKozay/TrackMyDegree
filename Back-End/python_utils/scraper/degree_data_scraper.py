import os
import sys
import re

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from utils.bs4_utils import get_all_links_from_div
from utils.parsing_utils import COURSE_REGEX
from utils.logging_utils import get_logger
from models import AnchorLink, DegreeScraperConfig, ECPDegreeIDs, ProgramRequirements
from scraper.abstract_degree_scraper import AbstractDegreeScraper
from scraper.gina_cody_degree_scraper import AeroDegreeScraper, BldgDegreeScraper, ChemDegreeScraper, CiviDegreeScraper, CoenDegreeScraper, ElecDegreeScraper, InduDegreeScraper, MechDegreeScraper, SoenDegreeScraper
from scraper.comp_sci_degree_scraper import CompDegreeScraper, CompCaDegreeScraper, CompDsDegreeScraper, CompHlsDegreeScraper
from scraper.ecp_coop_degree_scraper import EngrEcpDegreeScraper, CompEcpDegreeScraper, CompHlsEcpDegreeScraper,CoopDegreeScraper

class DegreeDataScraper():
    GINA_CODY_PROGRAMS_OFFERED_URL = "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-10-gina-cody-school-of-engineering-and-computer-science.html#9919"

    def __init__(self):
        self.logger = get_logger("DegreeDataScraper")
        self.degree_scraper_config: list[DegreeScraperConfig] = [
            DegreeScraperConfig(long_name="BEng in Aerospace Engineering Option: Aerodynamics and Propulsion", marker="BEng in Aerospace Engineering", short_name="AERO", ecp_degree_id=ECPDegreeIDs.ENGR_ECP_ID, scraper_class=AeroDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Aerospace Engineering Option: Aerospace Structures and Materials", marker="BEng in Aerospace Engineering", short_name="AERO", ecp_degree_id=ECPDegreeIDs.ENGR_ECP_ID, scraper_class=AeroDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Aerospace Engineering Option: Avionics and Aerospace Systems", marker="BEng in Aerospace Engineering", short_name="AERO", ecp_degree_id=ECPDegreeIDs.ENGR_ECP_ID, scraper_class=AeroDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Building Engineering", short_name="BLDG", ecp_degree_id=ECPDegreeIDs.ENGR_ECP_ID, scraper_class=BldgDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Chemical Engineering", short_name="CHEM", ecp_degree_id=ECPDegreeIDs.ENGR_ECP_ID, scraper_class=ChemDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Civil Engineering", short_name="CIVI", ecp_degree_id=ECPDegreeIDs.ENGR_ECP_ID, scraper_class=CiviDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Computer Engineering", short_name="COEN", ecp_degree_id=ECPDegreeIDs.ENGR_ECP_ID, scraper_class=CoenDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Electrical Engineering", short_name="ELEC", ecp_degree_id=ECPDegreeIDs.ENGR_ECP_ID, scraper_class=ElecDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Industrial Engineering", short_name="INDU", ecp_degree_id=ECPDegreeIDs.ENGR_ECP_ID, scraper_class=InduDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Mechanical Engineering", short_name="MECH", ecp_degree_id=ECPDegreeIDs.ENGR_ECP_ID, scraper_class=MechDegreeScraper),
            DegreeScraperConfig(long_name="BEng in Software Engineering", short_name="SOEN", ecp_degree_id=ECPDegreeIDs.ENGR_ECP_ID, scraper_class=SoenDegreeScraper),
            DegreeScraperConfig(long_name="BCompSc in Computer Science", short_name="COMP", ecp_degree_id=ECPDegreeIDs.COMP_ECP_ID, scraper_class=CompDegreeScraper),
            DegreeScraperConfig(long_name="BCompSc Joint Major in Computation Arts and Computer Science", short_name="COMP_CA", ecp_degree_id=ECPDegreeIDs.COMP_ECP_ID, scraper_class=CompCaDegreeScraper),
            DegreeScraperConfig(long_name="BCompSc Joint Major in Data Science", short_name="COMP_DS", ecp_degree_id=ECPDegreeIDs.COMP_ECP_ID, scraper_class=CompDsDegreeScraper),
            DegreeScraperConfig(long_name="BCompSc in Health and Life Sciences", short_name="COMP_HLS", ecp_degree_id=ECPDegreeIDs.COMP_HLS_ECP_ID, scraper_class=CompHlsDegreeScraper),
            DegreeScraperConfig(long_name=ECPDegreeIDs.ENGR_ECP_ID, marker="Extended Credit Program", short_name="ENGR_ECP", ecp_degree_id="", scraper_class=EngrEcpDegreeScraper),
            DegreeScraperConfig(long_name=ECPDegreeIDs.COMP_ECP_ID, marker="Section 71.70.3 Extended Credit Program", ecp_degree_id="", short_name="COMP_ECP", scraper_class=CompEcpDegreeScraper),
            DegreeScraperConfig(long_name=ECPDegreeIDs.COMP_HLS_ECP_ID, short_name="COMP_HLS_ECP", ecp_degree_id="", scraper_class=CompHlsEcpDegreeScraper),
            DegreeScraperConfig(long_name="Co-op Program", short_name="COOP", ecp_degree_id="", scraper_class=CoopDegreeScraper),
        ]
        self._init_scrapers()

    def _init_scrapers(self) -> dict[str, AbstractDegreeScraper]:
        # Get degree programs
        degree_links = get_all_links_from_div(self.GINA_CODY_PROGRAMS_OFFERED_URL, ["content-main"], exclude_regex=COURSE_REGEX)
        degree_links.append(AnchorLink(text="Co-op Program", url=""))
        degree_links.append(AnchorLink(text="BCompSc in Health and Life Sciences", url="https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-75-computer-science-in-health-and-life-sciences/section-71-75-1-curriculum-for-the-degree-of-bcompsc-in-health-and-life-sciences.html"))
        degree_links.append(AnchorLink(text=ECPDegreeIDs.COMP_HLS_ECP_ID, url="https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-75-computer-science-in-health-and-life-sciences/section-71-75-1-curriculum-for-the-degree-of-bcompsc-in-health-and-life-sciences.html"))
        self.degree_scrapers = {}
        for config in self.degree_scraper_config:
            degree_link = next((link for link in degree_links if config.marker in link.text), None)
            if degree_link:
                self.degree_scrapers[config.long_name] = config.scraper_class(
                                                            degree_name=config.long_name,
                                                            degree_short_name=config.short_name,
                                                            ecp_degree_id=config.ecp_degree_id,
                                                            requirements_url=degree_link.url)
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