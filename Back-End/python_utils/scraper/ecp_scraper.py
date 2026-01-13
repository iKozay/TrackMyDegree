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

    for pool in course_pool:
        degree['coursePools'].append(pool['name'])
    print({'degree':degree, 'course_pool':course_pool, 'courses':len(courses)})
    return {'degree':degree, 'course_pool':course_pool, 'courses':courses}

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

    for course in exclusion_list[1]:
        if course["code"] in course_pool[1]['courses']:
            course_pool[1]['courses'].remove(course['code'])
            courses.remove(course)

    # Option Electives

    ENGR_URL='https://www.concordia.ca/academics/undergraduate/calendar/current/quick-links/gina-cody-school-of-engineering-and-computer-science-courses.html'
    DESIGN_URL='https://www.concordia.ca/academics/undergraduate/calendar/current/section-81-faculty-of-fine-arts/section-81-90-department-of-design-and-computation-arts/design-courses.html'
    COMP_ART_URL='https://www.concordia.ca/academics/undergraduate/calendar/current/section-81-faculty-of-fine-arts/section-81-90-department-of-design-and-computation-arts/computation-arts-courses.html'
    MATH_STAT_URL='https://www.concordia.ca/academics/undergraduate/calendar/current/section-31-faculty-of-arts-and-science/section-31-200-department-of-mathematics-and-statistics/mathematics-and-statistics-courses.html'

    gina_cody_classes=[]
    comp_and_soen_classes=[]
    design_and_comp_art_classes=course_data_scraper.extract_course_data('ANY', DESIGN_URL)[0]+course_data_scraper.extract_course_data('ANY', COMP_ART_URL)[0]
    math_and_stat_classes=course_data_scraper.extract_course_data('ANY', MATH_STAT_URL)

    gina_cody_html=course_data_scraper.fetch_html(ENGR_URL)
    gina_cody_html=gina_cody_html.find('div', class_='content-main parsys')
    departments = gina_cody_html.findAll('a')
    for dep in departments:
        if 'Computer Science' in dep.text or 'Software Engineering' in dep.text:
            comp_and_soen_classes+=course_data_scraper.extract_course_data('ANY', dep.get('href'))
        else:
            gina_cody_classes+=course_data_scraper.extract_course_data('ANY', dep.get('href'))
    
    
    course_pool.append({
        '_id': "(ANYTHING EXCEPT COURSES IN THIS COURSE POOL) ECP Electives: BCompSc (other than Joint Majors)",
        'name': "(ANYTHING EXCEPT COURSES IN THIS COURSE POOL) ECP Electives: BCompSc (other than Joint Majors)",
        'creditsRequired': 15,
        'courses':exclusion_list[0]+gina_cody_classes
    })
    course_pool.append({
        '_id': "(ANYTHING EXCEPT COURSES IN THIS COURSE POOL) ECP Electives: Joint Major in Computation Arts and Computer Science",
        'name': "(ANYTHING EXCEPT COURSES IN THIS COURSE POOL) ECP Electives: Joint Major in Computation Arts and Computer Science",
        'creditsRequired': 15,
        'courses':exclusion_list[0]+gina_cody_classes+comp_and_soen_classes+design_and_comp_art_classes
    })
    course_pool.append({
        '_id': "(ANYTHING EXCEPT COURSES IN THIS COURSE POOL) ECP Electives: Joint Major in Data Science",
        'name': "(ANYTHING EXCEPT COURSES IN THIS COURSE POOL) ECP Electives: Joint Major in Data Science",
        'creditsRequired': 15,
        'courses':exclusion_list[0]+gina_cody_classes+comp_and_soen_classes+math_and_stat_classes[0]
    })

    for pool in course_pool:
        degree['coursePools'].append(pool['name'])
    
    return {'degree':degree, 'course_pool':course_pool, 'courses':courses}
