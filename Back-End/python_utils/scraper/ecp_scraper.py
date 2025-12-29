'''
This scraper scrapes two degrees: one for COMP ECP and another for ENGR ECP.
'''
from . import course_data_scraper
from . import engr_general_electives_scraper
from urllib.parse import urljoin

def add_courses(course_list, url):
    courses=[]
    course_pool_courses=[]
    for course in course_list:
        course_code = course.find('a').text
        courses.append(course_data_scraper.extract_course_data(course_code,urljoin(url, course.find('a').get('href'))))
        course_pool_courses.append(course_code)
    return [course_pool_courses, courses]

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
    core_course_list=add_courses(tr[1].findAll('div', class_='formatted-course'), URL)
    course_pool[0]['courses']+=core_course_list[0]
    courses+=core_course_list[1]
    
    # Natural Science Electives
    course_pool.append({
        '_id': "ECP_ENGR_Natural_Science_Electives",
        'name': "ECP_ENGR_Natural_Science_Electives",
        'creditsRequired': 6,
        'courses':[]
    })

    def_group = soup.find('div', class_='defined-group', title=tr[2].find('a').text)
    nat_sci_course_list = add_courses(def_group.findAll('div', class_='formatted-course'), URL)
    course_pool[1]['courses']+=nat_sci_course_list[0]
    courses+=nat_sci_course_list[1]

    # General Electives
    course_pool.append({
        '_id': "ECP_ENGR_General_Electives",
        'name': "ECP_ENGR_General_Electives",
        'creditsRequired': 6,
        'courses':[]
    })

    gen_electives = engr_general_electives_scraper.scrape_electives()
    course_pool[2]['courses']+=gen_electives[0]
    courses+=gen_electives[1]

    return [degree, course_pool, courses]

def scrape_comp_ecp():
    URL="https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-70-department-of-computer-science-and-software-engineering/section-71-70-3-extended-credit-program.html"
    degree={
            '_id': "COMP_ECP",
            'name': "COMP Extended Credits Program",
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
        '_id': "ECP_COMP_Core",
        'name': "ECP_COMP_Core",
        'creditsRequired': 9,
        'courses':[]
    })

    core_course_list=add_courses(tr[1].findAll('div', class_='formatted-course'), URL)
    course_pool[0]['courses']+=core_course_list[0]
    courses+=core_course_list[1]

    # General Electives
    course_pool.append({
        '_id': "ECP_ENGR_General_Electives",
        'name': "ECP_ENGR_General_Electives",
        'creditsRequired': 6,
        'courses':[]
    })

    exclusion_list_html=soup.find('div', class_='defined-group', title='ECP Electives Exclusion List')
    exclusion_list=add_courses(exclusion_list_html.findAll('div', class_='formatted-course'), URL)

    gen_electives = engr_general_electives_scraper.scrape_electives()
    course_pool[1]['courses']+=gen_electives[0]
    courses+=gen_electives[1]

    print(exclusion_list[0])

    for course in exclusion_list[1]:
        if course["code"] in course_pool[1]['courses']:
            course_pool[1]['courses'].remove(course['code'])
            courses.remove(course)

