from . import course_data_scraper
from . import engr_general_electives_scraper
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

def get_comp_gen_electives(url, course_codes):
    #get exclusion list
    soup=course_data_scraper.fetch_html(url)
    soup=soup.find('div', class_='defined-group', title="General Electives Exclusion List")
    exclusion_list = [a.text for a in soup.find_all('a')]

    #getting course codes
    engr_electives=engr_general_electives_scraper.scrape_electives()
    output_codes=course_codes+engr_electives[0]

    temp_electives_for_itteration = engr_electives[1].copy()
    #removing exclusions
    for course in temp_electives_for_itteration:
        if course["code"] in exclusion_list:
            output_codes.remove(course["code"])
            engr_electives[1].remove(course)
    
    return [output_codes, engr_electives[1]]