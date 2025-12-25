'''
This scraper scrapes two degrees: one for COMP ECP and another for ENGR ECP.
'''
from . import course_data_scraper
from . import engr_general_electives_scraper
from urllib.parse import urljoin


def scrape_engr_ecp():
    URL = "https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-20-beng/section-71-20-2-alternative-entry-programs.html"
    degree={
            '_id': "ENGR_ECP",
            'name': "ENGR Extended Credits Program",
            'totalCredits': 30,
            'coursePools': []
        }
    course_pool=[]
    courses=[]

    soup = course_data_scraper.fetch_html(URL)
    def_group = soup.find('div', class_='defined-group')
    tr = def_group.findAll('tr')
    
    #Core courses
    course_pool.append({
        '_id': "ECP_ENGR_Core",
        'name': "ECP_ENGR_Core",
        'creditsRequired': 18,
        'courses':[]
    })
    core_course_list=tr[1].findAll('div', class_='formatted-course')
    for course in core_course_list:
        course_code = course.find('a').text
        courses.append(course_data_scraper.extract_course_data(course_code,urljoin(URL, course.find('a').get('href'))))
        course_pool[0]["courses"].append(course_code)

    for course in courses:
        print(course)
        print('\n')