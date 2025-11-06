import course_data_scraper
from bs4 import BeautifulSoup
from bs4.dammit import EncodingDetector
from urllib.parse import urljoin

USERAGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
headers = {"User-Agent": USERAGENT}

courses=[]
course_codes=[]
url="https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-110-complementary-studies-for-engineering-and-computer-science-students"
def scrape_electives():
    soup = course_data_scraper.fetch_html(url)
    soup = soup.find('tbody')
    tbody = soup.find_all('tr')
    exclusion_tr = tbody[4]
    excluded_courses = [a.text for a in exclusion_tr.find_all('a')]

    faculties = tbody[1].find_all('a') + tbody[2].find_all('a')
    global courses
    for faculty in faculties:
        courses += course_data_scraper.extract_course_data('ANY', urljoin(url, faculty.get('href')))

    global course_codes
    filtered_courses = [c for c in courses if c["_id"] not in excluded_courses]
    course_codes = [c["_id"] for c in filtered_courses]
    courses[:] = filtered_courses

    return [course_codes, courses]

    