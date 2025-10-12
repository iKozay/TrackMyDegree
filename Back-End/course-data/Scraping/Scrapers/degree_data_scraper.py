from bs4 import BeautifulSoup
from bs4.dammit import EncodingDetector
from urllib.parse import urljoin
import json
import requests
import re
import sys

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

# Function to clean and normalize text with proper spacing
def clean_text(text):
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)  # Collapse multiple spaces into one
    text = re.sub(r'([a-zA-Z0-9])([A-Z][a-z])', r'\1 \2', text)  # Space before capital letters
    text = re.sub(r'([a-zA-Z])(\d)', r'\1 \2', text)  # Space between letters and numbers
    text = re.sub(r'(\d)([a-zA-Z])', r'\1 \2', text)  # Space between numbers and letters
    text = text.replace('\u2011', '-')  # Non-breaking hyphen to regular hyphen
    text = text.replace('\u2019', "'")  # Right single quote to straight quote
    text = text.replace('\u2014', ' — ')  # En dash with spaces
    text = text.replace('\u00a0', ' ')  # Non-breaking space to regular space
    text = re.sub(r'\s*([.,:;])\s*', r'\1 ', text)  # Single space after punctuation
    text = re.sub(r'\s+', ' ', text.strip())  # Final cleanup
    return text

def get_courses(url, pool_name):
    output = []
    if temp_url in sys.argv[1]:
        course_list=soup.find('div', class_='defined-group', title=pool_name)
        course_list = course_list.find_all('div', class_="formatted-course")
        for course in course_list:
            output.append(course.find('span', class_="course-code-number").find('a').text)
    else:
        page_html=get_page(urljoin(sys.argv[1], url))
        course_list=page_html.find_all('div', class_="formatted-course")
        for course in course_list:
            output.append(course.find('a').text)
    return output


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
except Exception as e:
    print(f"Error processing course block: {e}")

#Save to JSON files
output_path = sys.argv[2]
with open(output_path+"/course_pool.json", 'w', encoding='utf-8') as json_file:
    json.dump(course_pool, json_file, indent=4, ensure_ascii=False)
with open(output_path+"/degree.json", 'w', encoding='utf-8') as json_file:
    json.dump(degree, json_file, indent=4, ensure_ascii=False)