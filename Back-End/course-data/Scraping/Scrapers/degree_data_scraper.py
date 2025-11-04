from bs4 import BeautifulSoup
from bs4.dammit import EncodingDetector
from urllib.parse import urljoin
import json
import requests
import re
import sys
import course_data_scraper

#Arguments
#argv[1] is the url of the page to be scraped for course data
#argv[2] is for the name of the output files

# Set a user agent to mimic a real browser
USERAGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
headers = {"User-Agent": USERAGENT}


# Prepare the list to hold extracted course data
courses = []
course_pool=[]
degree = {
    'name':"",
    'totalCredits':0,
    'coursePools':[]
}

def get_page(url):
    # Fetch the webpage content
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print(f"Failed to fetch the webpage. Status code: {resp.status_code}")
        exit()
    # Detect encoding
    http_encoding = resp.encoding if 'charset' in resp.headers.get('content-type', '').lower() else None
    html_encoding = EncodingDetector.find_declared_encoding(resp.content, is_html=True)
    encoding = html_encoding or http_encoding
    # Parse the HTML content with the detected encoding
    return BeautifulSoup(resp.content, 'lxml', from_encoding=encoding)


soup = get_page(sys.argv[1])


def get_courses(url, pool_name):
    output = []
    if temp_url in sys.argv[1]:
        course_list=soup.find('div', class_='defined-group', title=pool_name)
        course_list = course_list.find_all('div', class_="formatted-course")
        for course in course_list:
            output.append(course.find('span', class_="course-code-number").find('a').text)
            courses.append(course_data_scraper.extract_course_data(course.find('span', class_="course-code-number").find('a').text, urljoin(sys.argv[1],course.find('span', class_="course-code-number").find('a').get('href'))))
    else:
        page_html=get_page(urljoin(sys.argv[1], url))
        course_list=page_html.find_all('div', class_="formatted-course")
        for course in course_list:
            output.append(course.find('a').text)
            courses.append(course_data_scraper.extract_course_data(course.find('a').text, urljoin(sys.argv[1],course.find('span', class_="course-code-number").find('a').get('href'))))
    return output

def handle_engineering_core_restrictions(degree_name):
    if degree_name=="BEng in Mechanical Engineering" or degree_name=="Beng in Industrial Engineering" or degree_name=="BEng in Aerospace Engineering":
        course_pool[0]["courses"].remove("ELEC 275")
    elif degree_name=="BEng in Electrical Engineering" or degree_name=="BEng in Computer Engineering":
        course_pool[0]["courses"][course_pool[0]["courses"].index("ELEC 275")] = "ELEC 273"
        courses.append(course_data_scraper.extract_course_data("ELEC 275","https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-60-engineering-course-descriptions/electrical-engineering-courses.html#3940"))
    elif degree_name=="BEng in Building Engineering":
        course_pool[0]["courses"].remove("ENGR 202")
        course_pool[0]["courses"][course_pool[0]["courses"].index("ENGR 392")] = "BLDG 482"
        courses.append(course_data_scraper.extract_course_data("BLDG 482","https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-60-engineering-course-descriptions/building-engineering-courses.html#3750"))
    else:
        return
    course_pool[0]["name"]=f"({degree_name}) {course_pool[0]["name"]}"

try:
    #------------------------Course Pool--------------------------------------#
    pool_group = soup.find('div', class_='program-required-courses defined-group')
    pools = pool_group.find_all('tr')
    for pool in pools:
        credits = float(pool.find('td').text)
        name = pool.find('a').text
        temp_url = pool.find('a').get('href')
        temp_url = re.sub(r'#\d+$', '', temp_url)
        course_list=get_courses(temp_url, name)
        course_pool.append({
            'name': name,
            'creditsRequired': credits,
            'courses':course_list
        })
    #-----------------------Degree----------------------------------------#    
        degree["coursePools"].append(name)
    
    title = soup.find('div', class_="title program-title").find('h3').text
    match = re.search(r'(.+?)\s*\(\s*(\d+)\s+credits\s*\)', title, re.IGNORECASE)
    degree["name"] = match.group(1).strip()
    degree["totalCredits"] = int(match.group(2))

    handle_engineering_core_restrictions(degree["name"])
except Exception as e:
    print(f"Error processing course block: {e}")
    sys.exit(1)

#Save to JSON files
output_path = sys.argv[2]
with open(output_path+"/course_pool.json", 'w', encoding='utf-8') as json_file:
    json.dump(course_pool, json_file, indent=4, ensure_ascii=False)
with open(output_path+"/degree.json", 'w', encoding='utf-8') as json_file:
    json.dump(degree, json_file, indent=4, ensure_ascii=False)
with open(output_path+"/courses.json", 'w', encoding='utf-8') as json_file:
    json.dump(courses, json_file, indent=4, ensure_ascii=False)

print(f"Scraped data has been saved to {output_path}")