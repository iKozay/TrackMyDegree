'''
This scraper scrapes two degrees: one for COMP ECP and another for ENGR ECP.
'''
from . import course_data_scraper
from . import engr_general_electives_scraper


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
    print(tr[1])
    #Core courses
