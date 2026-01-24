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
        'name': "ECP ENGR Core",
        'creditsRequired': 18,
        'courses':[]
    })
    core_course_list=add_courses(tr[1].findAll('div', class_='formatted-course'), URL)
    course_pool[0]['courses']+=core_course_list[0]
    courses+=core_course_list[1]
    
    # Natural Science Electives
    course_pool.append({
        '_id': "ECP_ENGR_Natural_Science_Electives",
        'name': "ECP ENGR Natural Science Electives",
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
        'name': "ECP ENGR General Electives",
        'creditsRequired': 6,
        'courses':[]
    })

    gen_electives = engr_general_electives_scraper.scrape_electives()
    course_pool[2]['courses']+=gen_electives[0]
    courses+=gen_electives[1]

    for pool in course_pool:
        degree['coursePools'].append(pool['_id'])
    # remove any duplicate courses
    courses = list({course['code']: course for course in courses}.values())
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
        'name': "ECP COMP Core",
        'creditsRequired': 9,
        'courses':[]
    })

    core_course_list=add_courses(tr[1].findAll('div', class_='formatted-course'), URL)
    course_pool[0]['courses']+=core_course_list[0]
    courses+=core_course_list[1]

    # General Electives
    course_pool.append({
        '_id': "ECP_COMP_General_Electives",
        'name': "ECP COMP General Electives",
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
    gina_cody_exlcuded_subjects = ["ENCS", "ENGR", "AERO", "BCEE", "BLDG", "CIVI", "COEN", "ELEC", "IADI", "INDU", "MECH", "MIAE", "COMP", "SOEN"]
    design_and_comp_art_excluded_subjects = ["DART", "CART"]
    math_and_stat_excluded_subjects = ["ACTU", "MACF", "MATH", "MAST", "STAT"]

    from .concordia_api_utils import get_instance
    all_concordia_courses = get_instance().get_all_courses()
    courses_without_exlcusions = exclude_courses_from_list(all_concordia_courses, exclusion_list[0])

    electives_bcompsc_courses = exclude_subjects_from_list(courses_without_exlcusions, gina_cody_exlcuded_subjects)
    course_ids = [course["code"] for course in electives_bcompsc_courses]
    course_pool.append({
        '_id': "ECP Electives: BCompSc (other than Joint Majors)",
        'name': "ECP Electives: BCompSc (other than Joint Majors)",
        'creditsRequired': 15,
        'courses': course_ids
    })
    courses+=electives_bcompsc_courses

    electives_joint_major_comp_art_courses = exclude_subjects_from_list(courses_without_exlcusions, (gina_cody_exlcuded_subjects + design_and_comp_art_excluded_subjects))
    course_ids = [course["code"] for course in electives_joint_major_comp_art_courses]
    course_pool.append({
        '_id': "ECP Electives: Joint Major in Computation Arts and Computer Science",
        'name': "ECP Electives: Joint Major in Computation Arts and Computer Science",
        'creditsRequired': 15,
        'courses': course_ids
    })
    courses+=electives_joint_major_comp_art_courses

    electives_joint_major_data_science_courses = exclude_subjects_from_list(courses_without_exlcusions, (gina_cody_exlcuded_subjects + math_and_stat_excluded_subjects))
    course_ids = [course["code"] for course in electives_joint_major_data_science_courses]
    course_pool.append({
        '_id': "ECP Electives: Joint Major in Data Science",
        'name': "ECP Electives: Joint Major in Data Science",
        'creditsRequired': 15,
        'courses': course_ids
    })
    courses+=electives_joint_major_data_science_courses

    for pool in course_pool:
        degree['coursePools'].append(pool['_id'])
    # remove any duplicate courses
    courses = list({course['code']: course for course in courses}.values())
    return {'degree':degree, 'course_pool':course_pool, 'courses':courses}

# Course manipulation functions for ecp
def exclude_courses_from_list(course_list, exclusion_list):
    exclusion_set = set(exclusion_list)
    excluded_courses = [course for course in course_list if course["code"] not in exclusion_set]
    return excluded_courses

def exclude_subjects_from_list(course_list, excluded_subjects):
    excluded_subjects_set = set(excluded_subjects)
    excluded_courses = [course for course in course_list if course["code"].split()[0] not in excluded_subjects_set]
    return excluded_courses