from bs4 import BeautifulSoup
from bs4.dammit import EncodingDetector
from urllib.parse import urljoin
import requests
import re
from . import course_data_scraper
from . import engr_general_electives_scraper

# Set a user agent to mimic a real browser
USERAGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
headers = {"User-Agent": USERAGENT}

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
        resp = requests.get(url, headers=headers)
        if resp.status_code != 200:
            print(f"Failed to fetch the webpage. Status code: {resp.status_code}")
            raise Exception(f"Failed to fetch the webpage. Status code: {resp.status_code}")
        # Detect encoding
        http_encoding = resp.encoding if 'charset' in resp.headers.get('content-type', '').lower() else None
        html_encoding = EncodingDetector.find_declared_encoding(resp.content, is_html=True)
        encoding = html_encoding or http_encoding
        # Parse the HTML content with the detected encoding
        return BeautifulSoup(resp.content, 'lxml', from_encoding=encoding)

    def get_courses(self, url, pool_name):
        output = []
        if self.temp_url in self.url_received:
            course_list=self.soup.find('div', class_='defined-group', title=pool_name)
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
        return output

    def handle_engineering_core_restrictions(self, degree_name):
        if degree_name!="BEng in Industrial Engineering":
            self.course_pool[0]["creditsRequired"]=self.course_pool[0]["creditsRequired"]-3
            electives_results= engr_general_electives_scraper.scrape_electives()
            self.degree["coursePools"].append("General Education Humanities and Social Sciences Electives")
            self.course_pool.append({
                "_id":"General Education Humanities and Social Sciences Electives",
                "name":"General Education Humanities and Social Sciences Electives",
                "creditsRequired":3,
                "courses":electives_results[0]
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
                credits = float(pool.find('td').text)
                name = pool.find('a').text
                self.temp_url = pool.find('a').get('href')
                self.temp_url = re.sub(r'#\d+$', '', self.temp_url)
                course_list=self.get_courses(self.temp_url, name)
                course_pool_id = self.degree["name"].split(" ")[2][:4].upper() + "_" + name
                self.course_pool.append({
                    '_id': course_pool_id,
                    'name': name,
                    'creditsRequired': credits,
                    'courses':course_list
                })

                self.degree["coursePools"].append(course_pool_id)

            self.handle_engineering_core_restrictions(self.degree["name"])
        except Exception as e:
            print(f"Error processing course block: {e}")
            raise e

        #Output as JSON
        return {
            "degree":self.degree,
            "course_pool":self.course_pool,
            "courses":self.courses
        }