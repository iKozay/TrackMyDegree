import sys
import os
from abc import ABC, abstractmethod
from typing import Optional

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from models import CoursePool, Degree, DegreeType, ProgramRequirements, ScraperAPIResponse
from utils.logging_utils import get_logger
from utils.parsing_utils import get_course_sort_key

class AbstractDegreeScraper(ABC):

    def __init__(self, degree_name: str, degree_short_name: str, requirements_url: str):
        self.degree_name = degree_name
        self.degree_short_name = degree_short_name
        self.requirements_url = requirements_url
        self.program_requirements: Optional[ProgramRequirements] = None
        self.logger = get_logger(f"{self.degree_short_name}DegreeScraper")

    def scrape_degree(self) -> ScraperAPIResponse:
        self._get_program_requirements()
        self._handle_special_cases()
        self._sort_coursepool_courses()
        return ScraperAPIResponse(
            degree=self.program_requirements.degree,
            course_pools=self.program_requirements.course_pools,
            courses=[]
        )

    def _set_program_requirements(self, program_name: str, total_credits: float, degree_type: DegreeType, coursepools_list: list[CoursePool]) -> None:
        course_pool_ids = [pool._id for pool in coursepools_list]
        degree = Degree(_id=program_name, name=program_name, degree_type=degree_type, credits_required=total_credits, course_pools=course_pool_ids)
        self.program_requirements = ProgramRequirements(degree=degree, course_pools=coursepools_list)

    @abstractmethod
    def _get_program_requirements(self) -> None:
        # To be implemented by child classes to populate self.program_requirements with scraped data
        pass

    @abstractmethod
    def _handle_special_cases(self) -> None:
        # To be implemented by child classes for degree-specific special case handling
        pass

    def _sort_coursepool_courses(self) -> None:
        if self.program_requirements:
            for pool in self.program_requirements.course_pools:
                pool.courses.sort(key=get_course_sort_key)

    # Helper methods
    def add_courses_to_pool(self, pool_name: str, courses_to_add: list[str]) -> None:
        for pool in self.program_requirements.course_pools:
            if pool.name == pool_name:
                pool.courses.extend(courses_to_add)
                pool.courses = list(set(pool.courses))  # Remove duplicates

    def remove_courses_from_pool(self, pool_name: str, courses_to_remove: list[str]) -> None:
        for pool in self.program_requirements.course_pools:
            if pool.name == pool_name:
                pool.courses = [course for course in pool.courses if course not in courses_to_remove]