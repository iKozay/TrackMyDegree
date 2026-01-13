from bs4 import BeautifulSoup
from bs4.dammit import EncodingDetector
from urllib.parse import urljoin
import requests
import re
from . import course_data_scraper
from . import engr_general_electives_scraper
from . import comp_utils
from . import ecp_scraper

# Set a user agent to mimic a real browser
USERAGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
headers = {"User-Agent": USERAGENT}

GENERAL_ELECTIVES = "General Education Humanities and Social Sciences Electives"

class DegreeDataScraper():
    def __init__(self):
        self.courses = []
        self.course_pool = []
        self.degree = {
            '_id': "",
            'name': "",
            'totalCredits': 0,
            'coursePools': []
        }

    def get_page(self, url):
        # Fetch the webpage content
        try:
            resp = requests.get(url, headers=headers)
            resp.raise_for_status()
        except requests.HTTPError:
            print(f"Failed to fetch the webpage. Status code: {resp.status_code}")
            raise
        # Detect encoding
        http_encoding = resp.encoding if 'charset' in resp.headers.get('content-type', '').lower() else None
        html_encoding = EncodingDetector.find_declared_encoding(resp.content, is_html=True)
        encoding = html_encoding or http_encoding
        # Parse the HTML content with the detected encoding
        return BeautifulSoup(resp.content, 'lxml', from_encoding=encoding)

    def get_courses(self, url, pool_name):
        output = []

        if pool_name=="General Electives: BCompSc":
            combined_course_codes_list = self.course_pool[-1]["courses"]+self.course_pool[-2]["courses"]
            comp_gen_electives=comp_utils.get_comp_gen_electives(urljoin(self.url_received, url), combined_course_codes_list)
            self.courses+=comp_gen_electives[1]
            return comp_gen_electives[0]

        if self.temp_url in self.url_received:
            course_list=self.soup.find('div', class_='defined-group', title=pool_name.rstrip())
            course_list = course_list.find_all('div', class_="formatted-course")
            for course in course_list:
                output.append(course.find('span', class_="course-code-number").find('a').text)
                self.courses.append(course_data_scraper.extract_course_data(course.find('span', class_="course-code-number").find('a').text, urljoin(self.url_received,course.find('span', class_="course-code-number").find('a').get('href'))))
        else:
            page_html=self.get_page(urljoin(self.url_received, url))
            course_list=page_html.find_all('div', class_="formatted-course")
            for course in course_list:
                output.append(course.find('a').text)
                self.courses.append(course_data_scraper.extract_course_data(course.find('a').text, urljoin(self.url_received,course.find('span', class_="course-code-number").find('a').get('href'))))
        
        if pool_name=="Computer Science Electives":
            comp_courses_with_code_above_or_equal_to_325=comp_utils.get_comp_electives()
            output+=comp_courses_with_code_above_or_equal_to_325[0]
            self.courses+=comp_courses_with_code_above_or_equal_to_325[1]
        
        if output==[] and "Option" in pool_name:
            sub_pools=self.soup.find('div', class_='defined-group', title=pool_name.rstrip())
            a_tags=sub_pools.find_all('a')
            for a in a_tags:
                output+=self.get_courses(urljoin(self.url_received,a.get('href')), a.text)
        
    
        if output==[] and "Elective" in pool_name:
            course_list = self.soup.find_all('div', class_="formatted-course")
            for course in course_list:
                temp_course_data=course_data_scraper.extract_course_data(course.find('span', class_="course-code-number").find('a').text, urljoin(self.url_received,course.find('span', class_="course-code-number").find('a').get('href')))
                if temp_course_data not in self.courses:
                    self.courses.append(temp_course_data)
                    output.append(course.find('span', class_="course-code-number").find('a').text)

        return output


    def handle_engineering_core_restrictions(self, degree_name):
        if degree_name!="BEng in Industrial Engineering":
            self.course_pool[0]["creditsRequired"]=self.course_pool[0]["creditsRequired"]-3
            electives_results= engr_general_electives_scraper.scrape_electives()
            self.degree["coursePools"].append(GENERAL_ELECTIVES)
            self.course_pool.append({
                "_id":GENERAL_ELECTIVES,
                "name":GENERAL_ELECTIVES,
                "creditsRequired":3,
                "courses":list(set(electives_results[0]))
            })
            self.courses=self.courses+electives_results[1]
        else:
            self.course_pool[0]["courses"].append("ACCO 220")
            self.courses.append(course_data_scraper.extract_course_data("ACCO 220", "https://www.concordia.ca/academics/undergraduate/calendar/current/section-61-john-molson-school-of-business/section-61-40-department-of-accountancy/accountancy-courses"))

        if degree_name=="BEng in Mechanical Engineering" or degree_name=="Beng in Industrial Engineering" or degree_name=="BEng in Aerospace Engineering":
            self.course_pool[0]["courses"].remove("ELEC 275")
        elif degree_name=="BEng in Electrical Engineering" or degree_name=="BEng in Computer Engineering":
            self.course_pool[0]["courses"][self.course_pool[0]["courses"].index("ELEC 275")] = "ELEC 273"
            self.courses.append(course_data_scraper.extract_course_data("ELEC 273","https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-60-engineering-course-descriptions/electrical-engineering-courses.html#3940"))
        elif degree_name=="BEng in Building Engineering":
            self.course_pool[0]["courses"].remove("ENGR 202")
            self.course_pool[0]["courses"][self.course_pool[0]["courses"].index("ENGR 392")] = "BLDG 482"
            self.courses.append(course_data_scraper.extract_course_data("BLDG 482","https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-60-engineering-course-descriptions/building-engineering-courses.html#3750"))
        else:
            return

    def scrape_degree(self, url):
        if url == "engr_ecp":
            return ecp_scraper.scrape_engr_ecp()
        elif url == "comp_ecp":
            return ecp_scraper.scrape_comp_ecp()
        self.url_received = url
        self.soup = self.get_page(url)
        try:
            #-----------------------Degree----------------------------------------#    
            title = self.soup.find('div', class_="title program-title").find('h3').text
            match = re.search(r'(.+?)\s*\(\s*(\d+)\s+credits\s*\)', title, re.IGNORECASE)
            self.degree["name"] = match.group(1).strip()
            self.degree["_id"] = self.degree["name"]
            self.degree["totalCredits"] = int(match.group(2))

            
            #------------------------Course Pool--------------------------------------#
            pool_group = self.soup.find('div', class_='program-required-courses defined-group')
            pools = pool_group.find_all('tr')
            for pool in pools:
                try:
                    credits_required = float(pool.find('td').text) #in case the scraper runs into a paragraph
                except:
                    continue
                a_tags=pool.find_all('a')
                for a in a_tags:
                    name = a.text
                    self.temp_url = a.get('href')
                    self.temp_url = re.sub(r'#\d+$', '', self.temp_url)
                    course_list=self.get_courses(self.temp_url, name)
                    course_pool_id = self.degree["name"].split(" ")[2][:4].upper() + "_" + name
                    self.course_pool.append({
                        '_id': course_pool_id,
                        'name': name,
                        'creditsRequired': credits_required,
                        'courses':list(set(course_list))
                    })
                    self.degree["coursePools"].append(course_pool_id)
                    if "Core" in name:
                        break
            self.handle_engineering_core_restrictions(self.degree["name"])
        except Exception as e:
            print(f"Error processing course block: {e}")
            raise e

        #Output as JSON
        self.courses = list({c["_id"]: c for c in self.courses}.values())
        return {
            "degree":self.degree,
            "course_pool":self.course_pool,
            "courses":self.courses
        }
