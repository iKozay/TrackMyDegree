import sys
import os
# Add the root folder (parent of scraper) to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import re
from utils.bs4_utils import get_list_from_div, extract_courses

class CourseScraper:

    QUICK_LINKS_ROOT_URL = "https://www.concordia.ca/academics/undergraduate/calendar/current/quick-links.html"
    FACULTIES = {
        "Faculty of Arts and Science Courses",
        "John Molson School of Business Courses",
        "Gina Cody School of Engineering and Computer Science Courses",
        "Faculty of Fine Arts Courses"
    }

    def get_faculties(self):
        # Get faculties
        quick_links = get_list_from_div(self.QUICK_LINKS_ROOT_URL, ["content-main"])
        faculties = [
            item for item in quick_links
            if item["text"] in self.FACULTIES
        ]
        return faculties

    def scrape_all_courses(self):
        all_courses = []
        faculties = self.get_faculties()
        # Get all course catalogs for each faculty
        for faculty in faculties:
            catalogs = get_list_from_div(faculty['url'], ["content-main"])
            all_courses.extend(self._extract_courses_from_catalogs(catalogs))
        return all_courses
    
    def _extract_courses_from_catalogs(self, catalogs):
        courses = []
        completed_codes = set()
        for catalog in catalogs:
            text = catalog['text']
            url = catalog['url']

            # Find all 4-letter uppercase codes inside parentheses, e.g., "(ENCS)" or "(SOEN,ENCS,ENGR)"
            matches = re.findall(r'\(([A-Z]{4}(?:, ?[A-Z]{4})*)\)', text)
            for match in matches:
                # Split by comma if multiple codes and strip spaces
                codes = [code.strip() for code in match.split(',')]
                for code in codes:
                    if code not in completed_codes:
                        # Append courses for each code
                        courses.extend(extract_courses(code, url))
                        completed_codes.add(code)
        return courses