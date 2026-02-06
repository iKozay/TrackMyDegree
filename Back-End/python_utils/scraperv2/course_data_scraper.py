import sys
import os

# Add the root folder (parent of scraper) to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from utils.bs4_utils import get_all_links_from_div, get_soup
from utils.parsing_utils import clean_text, parse_course_rules, parse_course_title_and_credits, split_sections, parse_course_components
from models import AnchorLink, Course

class CourseDataScraper:

    QUICK_LINKS_ROOT_URL = "https://www.concordia.ca/academics/undergraduate/calendar/current/quick-links.html"
    FACULTIES = {
        "Faculty of Arts and Science Courses",
        "John Molson School of Business Courses",
        "Gina Cody School of Engineering and Computer Science Courses",
        "Faculty of Fine Arts Courses"
    }

    def __init__(self):
        # Dictionary to hold all courses
        # {course_id: Course}
        self.all_courses: dict[str, Course] = {}

    def get_faculties(self) -> list[AnchorLink]:
        # Get faculties
        quick_links = get_all_links_from_div(self.QUICK_LINKS_ROOT_URL, ["content-main"])
        faculties = [
            item for item in quick_links
            if item.text in self.FACULTIES
        ]
        return faculties

    def scrape_all_courses(self) -> None:
        faculties = self.get_faculties()
        # Get all course catalogs for each faculty
        for faculty in faculties:
            catalogs = get_all_links_from_div(faculty.url, ["content-main"])
            courses = self._extract_courses_from_catalogs(catalogs)
            for course in courses:
                self.all_courses[course._id] = course
    
    def get_courses_by_catalogs(self, catalogs: list[str]) -> list[Course]:
        courses = []
        for course_id, course_data in self.all_courses.items():
            catalog = course_id.split()[0]
            if catalog in catalogs:
                courses.append(Course(**course_data))
        return courses
    
    def get_courses_by_ids(self, course_ids: list[str]) -> list[Course]:
        courses = []
        for course_id in course_ids:
            course_data = self.all_courses.get(course_id)
            if course_data:
                courses.append(Course(**course_data))
        return courses
    
    def get_all_courses(self) -> list[Course]:
        return list(self.all_courses.values())

    def _extract_courses_from_catalogs(self, catalogs) -> list[Course]:
        courses = []
        for catalog in catalogs:
            courses.extend(self._parse_course_objects(catalog.url))
        return courses

    def _parse_course_objects(self, url: str) -> list[Course]:
        soup = get_soup(url)

        courses: list[Course] = []

        course_trees = soup.find_all("div", class_="ccms-course-tree")

        course_divs = set()
        for course_tree in course_trees:
            course_divs.update(course_tree.find_all("div", class_="course"))

        course_divs = list(course_divs)
        for div in course_divs:
            title_element = div.find('h3', class_='accordion-header xlarge')
            
            # Parse the title to extract course info
            course_id, title, course_credits = parse_course_title_and_credits(title_element)
            
            # Get the course content for description and prereq/coreq
            content_div = div.find('div', class_='accordion-body')
            full_text = clean_text(' '.join(content_div.stripped_strings)) if content_div else ""
            
            sections = split_sections(full_text)
            
            # Create Course object
            course = Course(
                _id=course_id,
                title=title,
                credits=course_credits or 0,
                description=sections.get("Description:", ""),
                offered_in=[],
                prereq_coreq_text=sections.get("Prerequisite/Corequisite:", ""),
                rules=parse_course_rules(sections.get("Prerequisite/Corequisite:", ""), sections.get("Notes:", "")),
                notes=sections.get("Notes:", ""),
                components=parse_course_components(sections.get("Component(s):", ""))
            )

            courses.append(course)

        return courses