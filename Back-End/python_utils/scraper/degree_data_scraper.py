from bs4 import BeautifulSoup
from bs4.dammit import EncodingDetector
from urllib.parse import urljoin, urlsplit
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
# _normalize: normalize strings by replacing special characters and collapsing spaces
def _normalize(s: str) -> str:
    if not s:
        return ""
    # normalize unicode dashes and nbsp, collapse spaces
    s = s.replace("\u2013", "-").replace("\u2014", "-").replace("\xa0", " ")
    return re.sub(r"\s+", " ", s).strip()

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
    # get_page: fetch and parse a webpage, handling encoding
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
    # _resolve_target: determine if href is same-page or external (avoid fetching same page again and missing fragment)
    def _resolve_target(self, href: str):
        """Decide whether href points to the same page (with fragment) or an external page."""
        absolute = urljoin(self.url_received, href or "")
        base = urlsplit(self.url_received)
        tgt = urlsplit(absolute)
        same_page = (tgt.scheme, tgt.netloc, tgt.path) == (base.scheme, base.netloc, base.path)
        if same_page:
            return ("same", tgt.fragment, absolute)
        return ("external", absolute, absolute)
    # _find_same_page_group: locate the defined-group div for the given pool name and fragment
    def _find_same_page_group(self, pool_name: str, fragment: str):
        if fragment:
            node = self.soup.find(id=fragment)
            if node:
                # section container can be the node itself or its parent defined-group
                if node.name == "div" and "defined-group" in (node.get("class") or []):
                    return node
                parent = node.find_parent("div", class_="defined-group")
                if parent:
                    return parent
        # fallback: match by normalized title
        norm = _normalize(pool_name)
        grp = self.soup.find("div", class_="defined-group",
                             title=re.compile(re.escape(norm), re.I))
        if grp:
            return grp
        # last resort: scan all groups
        for dg in self.soup.select("div.defined-group"):
            t = _normalize(dg.get_text(" "))
            if norm and norm in t:
                return dg
        return None
    # get_courses: extract course codes and data from the target page or same-page fragment
    def get_courses(self, href, pool_name):
        output = []

        if pool_name == "General Electives: BCompSc":
            combined_course_codes_list = self.course_pool[-1]["courses"] + self.course_pool[-2]["courses"]
            comp_gen_electives = comp_utils.get_comp_gen_electives(urljoin(self.url_received, href), combined_course_codes_list)
            self.courses += comp_gen_electives[1]
            return comp_gen_electives[0]

        # resolve target page or same-page fragment
        mode, target, _abs = self._resolve_target(href)
        container = None
        if mode == "same":
            fragment = target
            container = self._find_same_page_group(pool_name, fragment)
        else:
            page_html = self.get_page(target)
            container = page_html

        # primary: structured formatted-course blocks
        if container:
            course_nodes = container.find_all('div', class_="formatted-course")
            for course in course_nodes:
                code_el = course.find('span', class_="course-code-number")
                a = code_el.find('a') if code_el else None
                if not a:
                    continue
                code = a.get_text(strip=True)
                href2 = urljoin(self.url_received, a.get('href') or "")
                output.append(code)
                self.courses.append(course_data_scraper.extract_course_data(code, href2))

        # Electives/Options pages that list plain anchors (no formatted-course blocks)
        if not output and container:
            for a in container.find_all("a"):
                text = _normalize(a.get_text(" ", strip=True))
                href2 = a.get("href")
                if not href2 or not text:
                    continue
                if re.match(r"^[A-Za-z]{4}\s+\d{3,4}$", text):
                    abs_href = urljoin(self.url_received, href2)
                    output.append(text)
                    self.courses.append(course_data_scraper.extract_course_data(text, abs_href))

        if pool_name == "Computer Science Electives":
            comp_courses_with_code_above_or_equal_to_325 = comp_utils.get_comp_electives()
            output += comp_courses_with_code_above_or_equal_to_325[0]
            self.courses += comp_courses_with_code_above_or_equal_to_325[1]

        if not output and "Option" in pool_name:
            search_root = container if container else self.soup
            for a in search_root.find_all("a"):
                text = _normalize(a.get_text(" ", strip=True))
                href3 = a.get("href")
                if not href3 or not text or text == _normalize(pool_name):
                    continue
                sub = self.get_courses(href3, text)
                if sub:
                    output += sub

        if not output and "Elective" in pool_name:
            course_list = self.soup.find_all('div', class_="formatted-course")
            for course in course_list:
                code_el = course.find('span', class_="course-code-number")
                a = code_el.find('a') if code_el else None
                if not a:
                    continue
                code = a.get_text(strip=True)
                href2 = urljoin(self.url_received, a.get('href') or "")
                temp_course_data = course_data_scraper.extract_course_data(code, href2)
                if temp_course_data not in self.courses:
                    self.courses.append(temp_course_data)
                    output.append(code)

        return list(dict.fromkeys(output))
    # handle_engineering_core_restrictions: modify core course pool based on degree-specific rules
    def handle_engineering_core_restrictions(self, degree_name):
        if degree_name!="BEng in Industrial Engineering":
            self.course_pool[0]["creditsRequired"]=self.course_pool[0]["creditsRequired"]-3
            electives_results= engr_general_electives_scraper.scrape_electives()
            self.degree["coursePools"].append(GENERAL_ELECTIVES)
            self.course_pool.append({
                "_id":GENERAL_ELECTIVES,
                "name":GENERAL_ELECTIVES,
                "creditsRequired":3,
                "courses":list(dict.fromkeys(electives_results[0]))  # keep order
            })
            self.courses=self.courses+electives_results[1]
        else:
            self.course_pool[0]["courses"].append("ACCO 220")
            self.courses.append(course_data_scraper.extract_course_data("ACCO 220", "https://www.concordia.ca/academics/undergraduate/calendar/current/section-61-john-molson-school-of-business/section-61-40-department-of-accountancy/accountancy-courses"))

        if degree_name in ["BEng in Mechanical Engineering", "Beng in Industrial Engineering", "BEng in Aerospace Engineering"]:
            if "ELEC 275" in self.course_pool[0]["courses"]:
                self.course_pool[0]["courses"].remove("ELEC 275")
        elif degree_name in ["BEng in Electrical Engineering", "BEng in Computer Engineering"]:
            if "ELEC 275" in self.course_pool[0]["courses"]:
                self.course_pool[0]["courses"][self.course_pool[0]["courses"].index("ELEC 275")] = "ELEC 273"
                self.courses.append(course_data_scraper.extract_course_data("ELEC 273","https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-60-engineering-course-descriptions/electrical-engineering-courses.html#3940"))
        elif degree_name=="BEng in Building Engineering":
            if "ENGR 202" in self.course_pool[0]["courses"]:
                self.course_pool[0]["courses"].remove("ENGR 202")
            if "ENGR 392" in self.course_pool[0]["courses"]:
                self.course_pool[0]["courses"][self.course_pool[0]["courses"].index("ENGR 392")] = "BLDG 482"
                self.courses.append(course_data_scraper.extract_course_data("BLDG 482","https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-60-engineering-course-descriptions/building-engineering-courses.html#3750"))
        else:
            return
    def add_coop_courses(self):
        coop_courses = course_data_scraper.get_coop_courses()
        coop_courses_codes = [course["_id"] for course in coop_courses]
        coop_course_pool = {
            '_id': "Coop Courses",
            'name': "Coop Courses",
            'creditsRequired': 0,
            'courses': coop_courses_codes
        }
        self.degree["coursePools"].append(coop_course_pool["_id"])
        self.course_pool.append(coop_course_pool)
        self.courses += coop_courses

    # scrape_degree: main method to scrape degree data from the given URL
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
                # extract credits required
                td = pool.find('td')
                if not td:
                    continue
                credits_text = _normalize(td.get_text(" ", strip=True))
                m = re.search(r'(\d+(?:\.\d+)?)', credits_text)
                if not m:
                    continue
                credits_required = float(m.group(1))
                a_tags = pool.find_all('a')
                for a in a_tags:
                    name = _normalize(a.get_text(" ", strip=True))
                    href = a.get('href')
                    if not name or not href:
                        continue
                    course_list = self.get_courses(href, name)
                    course_pool_id = self.degree["name"].split(" ")[2][:4].upper() + "_" + name
                    self.course_pool.append({
                        '_id': course_pool_id,
                        'name': name,
                        'creditsRequired': credits_required,
                        'courses': list(dict.fromkeys(course_list))
                    })
                    self.degree["coursePools"].append(course_pool_id)
                    if "Core" in name:
                        break
            self.handle_engineering_core_restrictions(self.degree["name"])
            self.add_coop_courses()
        except Exception as e:
            print(f"Error processing course block: {e}")
            raise e

        # Output as JSON (dedupe courses by id)
        self.courses = [c for c in self.courses if c]
        self.courses = list({c["_id"]: c for c in self.courses}.values())
        return {
            "degree": self.degree,
            "course_pool": self.course_pool,
            "courses": self.courses
        }
