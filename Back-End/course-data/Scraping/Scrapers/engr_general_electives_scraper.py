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
    soup=course_data_scraper.fetch_html(url)
    soup=soup.find('tbody')
    tbody=soup.find_all('tr')
    exclusion_tr=tbody[4]
    excluded_courses=exclusion_tr.find_all('a')
    for i in range (len(excluded_courses)):
        excluded_courses[i]=excluded_courses[i].text
    
    faculties=tbody[1].find_all('a')+tbody[2].find_all('a')
    for faculty in faculties:
        global courses
        courses=courses+course_data_scraper.extract_course_data('ANY',urljoin(url,faculty.get('href')))

    for course in courses:
        if course["id"] not in excluded_courses:
            course_codes.append(course["id"])
        else:
            courses.remove(course)
    return [course_codes, courses]

    