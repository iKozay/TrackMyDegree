import sys
import os
import json

# Add the root folder (parent of scraper) to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from utils.bs4_utils import get_all_links_from_div, get_soup
from utils.parsing_utils import clean_text, parse_course_title_and_credits, parse_course_rules, split_sections, parse_course_components, get_course_sort_key
from utils.logging_utils import get_logger
from utils.concordia_api_utils import get_concordia_api_instance
from models import AnchorLink, Course, CourseRules, serialize

class CourseDataScraper:
    QUICK_LINKS_ROOT_URL = "https://www.concordia.ca/academics/undergraduate/calendar/current/quick-links.html"
    FACULTIES = {
        "Faculty of Arts and Science Courses",
        "John Molson School of Business Courses",
        "Gina Cody School of Engineering and Computer Science Courses",
        "Faculty of Fine Arts Courses",
        "Institute for Co-operative Education Courses",
    }
    ALL_SEMESTERS = ["Fall", "Winter", "Summer"]

    all_courses: dict[str, Course] = {}

    def __init__(self, cache_dir: str = None):
        self.logger = get_logger("CourseDataScraper")
        self.local_cache_file = os.path.join(cache_dir, "course_data_cache.json")

    def load_cache_from_file(self) -> None:
        if os.path.exists(self.local_cache_file):
            self.logger.info(f"Loading course data from local cache file: {self.local_cache_file}")
            with open(self.local_cache_file, "r") as f:
                cached_courses = json.load(f)
                for course_data in cached_courses.values():
                    course = Course(**course_data)
                    self.all_courses[course._id] = course
        else:
            self.logger.info("No local cache file found. Scraping course data from website...")
            self.scrape_all_courses()
            self._save_cache_to_file()
    
    def _save_cache_to_file(self) -> None:
        with open(self.local_cache_file, "w") as f:
            json.dump({course_id: serialize(course) for course_id, course in self.all_courses.items()}, f, indent=4)

    def scrape_all_courses(self) -> None:
        self.logger.info("Scraping all courses from website...")
        faculty_links = self._scrape_faculty_links()
        # Get all course subjects for each faculty
        for link in faculty_links:
            self.logger.info(f"Scraping courses for faculty: {link.text}")
            subjects = get_all_links_from_div(link.url, ["content-main"])

            if link.text == "Gina Cody School of Engineering and Computer Science Courses":
                # Add missing CHME link
                subjects.append(AnchorLink(text="Chemical and Materials Engineering Courses", url="https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-60-engineering-course-descriptions/chemical-and-materials-engineering-courses.html"))

            self.logger.info(f"Found {len(subjects)} subjects for faculty: {link.text}")

            # remove duplicate subjects based on url path (ignore hash/fragment)
            seen_urls = set()
            unique_links = []
            for subject_link in subjects:
                url_no_hash = subject_link.url.split('#')[0]
                if url_no_hash not in seen_urls:
                    seen_urls.add(url_no_hash)
                    unique_links.append(subject_link)
            subjects = unique_links

            courses = self._extract_courses_from_subjects(subjects)
            self.logger.info(f"Extracted {len(courses)} courses for faculty: {link.text}")
            for course in courses:
                self.all_courses[course._id] = course
        self.logger.info("Adding extra CWT 100,200,300 and 400 courses...")
        self._add_extra_cwt_courses()
        self.logger.info(f"Total courses scraped: {len(self.all_courses)}")
    
    def get_courses_by_subjects(self, subjects: list[str], inclusive: bool = True, return_full_object: bool = False) -> list[Course] | list[str]:
        self._scrape_if_needed()
        courses = []
        for course_id, course_data in self.all_courses.items():
            subject = course_id.split()[0]
            if (inclusive and subject in subjects) or (not inclusive and subject not in subjects):
                courses.append(course_data)
        if not return_full_object:
            return [course._id for course in courses]
        return courses
    
    def get_courses_by_ids(self, course_ids: list[str], inclusive: bool = True, return_full_object: bool = False) -> list[Course] | list[str]:
        self._scrape_if_needed()
        courses = []
        for course_id in course_ids:
            course_data = self.all_courses.get(course_id)
            if course_data and ((inclusive and course_id in course_ids) or (not inclusive and course_id not in course_ids)):
                courses.append(course_data)
        if not return_full_object:
            return [course._id for course in courses]
        return courses
    
    def get_all_courses(self, return_full_object: bool = False) -> list[Course] | list[str]:
        self._scrape_if_needed()
        if not return_full_object:
            return sorted(self.all_courses.keys(), key=get_course_sort_key)
        return sorted(self.all_courses.values(), key=lambda course: get_course_sort_key(course._id))

    def _scrape_if_needed(self) -> None:
        if not self.all_courses:
            self.scrape_all_courses()

    def _scrape_faculty_links(self) -> list[AnchorLink]:
        # Get faculties
        quick_links = get_all_links_from_div(self.QUICK_LINKS_ROOT_URL, ["content-main"])
        faculties = [
            item for item in quick_links
            if item.text in self.FACULTIES
        ]
        return faculties

    def _extract_courses_from_subjects(self, subjects) -> list[Course]:
        courses = []
        for subject in subjects:
            courses.extend(self._parse_course_objects(subject.url))
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
            
            if "CWT" in course_id:
                offered_in = self.ALL_SEMESTERS
            else:
                offered_in = get_concordia_api_instance().get_term(course_id)

            # Create Course object
            course = Course(
                _id=course_id,
                title=title,
                credits=course_credits,
                description=sections.get("Description:", ""),
                offered_in=offered_in,
                prereqCoreqText=sections.get("Prerequisite/Corequisite:", ""),
                rules=parse_course_rules(sections.get("Prerequisite/Corequisite:", ""), sections.get("Notes:", "")),
                notes=sections.get("Notes:", ""),
                components=parse_course_components(sections.get("Component(s):", ""))
            )

            courses.append(course)

        return courses

    def _add_extra_cwt_courses(self) -> None:
        # Add CWT courses that are not listed in the quick links
        extra_cwt_courses = [
            Course(_id="CWT 100", title="Co-op Work Term 1", credits=0.0, description="Co-op Work Term 1", offered_in=self.ALL_SEMESTERS, prereqCoreqText="Must be completed concurrently: CWT 101", rules=CourseRules(), notes="", components=[]),
            Course(_id="CWT 200", title="Co-op Work Term 2", credits=0.0, description="Co-op Work Term 2", offered_in=self.ALL_SEMESTERS, prereqCoreqText="Must be completed previously: CWT 100, CWT 101. Must be completed concurrently: CWT 201", rules=CourseRules(), notes="", components=[]),
            Course(_id="CWT 300", title="Co-op Work Term 3", credits=0.0, description="Co-op Work Term 3", offered_in=self.ALL_SEMESTERS, prereqCoreqText="Must be completed previously: CWT 200, CWT 201. Must be completed concurrently: CWT 301", rules=CourseRules(), notes="", components=[]),
            Course(_id="CWT 400", title="Co-op Work Term 4", credits=0.0, description="Co-op Work Term 4", offered_in=self.ALL_SEMESTERS, prereqCoreqText="Must be completed previously: CWT 300, CWT 301. Must be completed concurrently: CWT 401", rules=CourseRules(), notes="", components=[])
        ]
        for course in extra_cwt_courses:
            course.rules = parse_course_rules(course.prereqCoreqText, course.notes)
            self.all_courses[course._id] = course

course_scraper_instance: CourseDataScraper = None
def init_course_scraper_instance(cache_dir: str) -> None:
    global course_scraper_instance
    course_scraper_instance = CourseDataScraper(cache_dir=cache_dir)

def get_course_scraper_instance() -> CourseDataScraper:
    global course_scraper_instance
    if course_scraper_instance is None:
        raise RuntimeError("CourseDataScraper instance not initialized. Call init_course_scraper_instance() first.")
    return course_scraper_instance