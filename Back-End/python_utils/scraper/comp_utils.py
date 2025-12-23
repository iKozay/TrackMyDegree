from . import course_data_scraper
import re

def get_comp_electives():
    course_codes=[]
    courses=[]
    url="https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-70-department-of-computer-science-and-software-engineering/section-71-70-10-computer-science-and-software-engineering-courses.html"
    
    courses=course_data_scraper.extract_course_data("ANY", url)
    temp_courses_for_itteration = courses.copy()

    for course in temp_courses_for_itteration:
        course_code_number = re.sub(r'[^0-9]', '', course["code"])
        if int(course_code_number)<325:
            courses.remove(course)
        else:
            course_codes.append(course["code"])
    
    return [course_codes, courses]

def get_comp_gen_electives():
    pass