import requests
import pandas as pd
import tempfile
import os
import re

TERM = ["0", "Summer", "Fall", "Fall/Winter", "Winter", "Spring (for CCCE career only)", "Summer (for CCCE career only)"]

CSV_SOURCES = {
    "course_catalog": {
        "url": "https://opendata.concordia.ca/datasets/sis/CU_SR_OPEN_DATA_CATALOG.csv",
        "cache": None,
        "subject_col": "Subject",
        "catalog_col": "Catalog"
    },
    "course_description": {
        "url": "https://opendata.concordia.ca/datasets/sis/CU_SR_OPEN_DATA_CATALOG_DESC.csv",
        "cache": None,
        "subject_col": None,
        "catalog_col": None
    },
    "course_schedule": {
        "url": "https://opendata.concordia.ca/datasets/sis/CU_SR_OPEN_DATA_SCHED.csv",
        "cache": None,
        "subject_col": "Subject",
        "catalog_col": "Catalog Nbr"
    },
    "course_section": {
        "url": "https://opendata.concordia.ca/datasets/sis/CU_SR_OPEN_DATA_COMB_SECTIONS.csv",
        "cache": None,
        "subject_col": "Subject",
        "catalog_col": "Catalog Nbr"
    },
}

class ConcordiaAPIUtils:

    def __init__(self):
        pass

    def clear_cache(self):
        for csv_name in CSV_SOURCES:
            CSV_SOURCES[csv_name]["cache"] = None
    
    def _sanitize_data(self, data):
        if isinstance(data, list):
            return [self._sanitize_data(item) for item in data]
        elif isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                if pd.isna(value) or value is None:
                    sanitized[key] = ""
                elif isinstance(value, (int, float)) and not pd.isna(value):
                    sanitized[key] = str(value)
                else:
                    sanitized[key] = str(value) if value is not None else ""
            return sanitized
        else:
            return str(data) if data is not None and not pd.isna(data) else ""

    def download_cache(self, names=None):
        # If names is None, refresh all caches
        if names is None:
            names = CSV_SOURCES.keys()
        
        for csv_name, csv_info in CSV_SOURCES.items():
            if csv_name not in names:
                continue
                
            # Skip if cache exists and not forcing refresh
            if csv_info["cache"] is not None:
                print(f"Cache for {csv_name} already exists, skipping...")
                continue
                
            print(f"Downloading cache for {csv_name}...")
            # Download the CSV file
            response = requests.get(csv_info["url"], stream=True)
            response.raise_for_status()
            # Save to temp directory
            temp_dir = tempfile.gettempdir()
            csv_file_path = os.path.join(temp_dir, f"{csv_name}.csv")
            with open(csv_file_path, "wb") as temp_file:
                for chunk in response.iter_content(chunk_size=8192):
                    temp_file.write(chunk)

        # Load the downloaded CSVs into cache
        self.update_cache(names)

    def update_cache(self, names=None):
        if names is None:
            names = CSV_SOURCES.keys()
        
        for csv_name, csv_info in CSV_SOURCES.items():
            if csv_name not in names:
                continue
            # Load into pandas to cache it from temp directory
            temp_dir = tempfile.gettempdir()
            csv_file_path = os.path.join(temp_dir, f"{csv_name}.csv")
            CSV_SOURCES[csv_name]["cache"] = pd.read_csv(csv_file_path, dtype=str, encoding='utf-16')


    def get_from_csv(self, csv_name, subject=None, catalog=None, course_id=None):
        if CSV_SOURCES[csv_name]["cache"] is None:
            self.update_cache([csv_name])

        df = CSV_SOURCES[csv_name]["cache"]

        if subject is not None and catalog is not None:
            matches = df[(df[CSV_SOURCES[csv_name]["subject_col"]] == subject) & 
                        (df[CSV_SOURCES[csv_name]["catalog_col"]] == catalog)]
        elif course_id is not None:
            matches = df[df["Course ID"] == course_id]
        else:
            matches = pd.DataFrame()

        if matches.empty:
            return []

        records = matches.to_dict('records')
        return self._sanitize_data(records)

    def get_term(self, course_code):
        subject_and_catalog = course_code.split()
        terms = []

        response = self.get_from_csv("course_section", subject=subject_and_catalog[0], catalog=subject_and_catalog[1])
        # Fall back to course_schedule if no data found in course_section
        if response == []:
            response = self.get_from_csv("course_schedule", subject=subject_and_catalog[0], catalog=subject_and_catalog[1])

        for dict in response:
            term_int = int(dict["Term Code"])
            for i in range(3):
                term_int = term_int % pow(10, 3-i)
            
            terms.append(TERM[term_int])
        return list(set(terms))

    def get_course_from_catalog(self, course_code):
        subject_and_catalog = course_code.split()

        response = self.get_from_csv("course_catalog", subject=subject_and_catalog[0], catalog=subject_and_catalog[1])
        if not response:
            return {}
        response = response[0]
        description_text = self.get_course_description(response.get("Course ID", ""))
        extracted_text = self.parse_description_and_rules(description_text)
        return {
            "_id": course_code,
            "code": course_code,
            "title": response.get("Long Title", ""),
            "credits": float(response.get("Class Units", "0")),
            "description": extracted_text["description"],
            "offeredIn": self.get_term(course_code),
            "prereqCoreqText": extracted_text["prereqCoreqText"],
            "rules": {
                "prereq": extracted_text["prereq"],
                "coreq": extracted_text["coreq"],
                "not_taken": extracted_text["not_taken"]
            }
        }
    
    def get_all_courses(self):
        if CSV_SOURCES["course_catalog"]["cache"] is None:
            self.update_cache(["course_catalog"])
        if CSV_SOURCES["course_description"]["cache"] is None:
            self.update_cache(["course_description"])
        
        df_catalog = CSV_SOURCES["course_catalog"]["cache"]
        df_description = CSV_SOURCES["course_description"]["cache"]
        matches = df_catalog[(df_catalog["Career"] == "UGRD") & (df_catalog["Component Code"] == "LEC")]
        records = self._sanitize_data(matches.to_dict('records'))
        courses = []
        for row in records:
            course_code = f"{row['Subject']} {row['Catalog']}"
            description_row = df_description[df_description["Course ID"] == row["Course ID"]]
            sanitized_description = self._sanitize_data(description_row.to_dict('records'))
            description_text = ""
            if sanitized_description:
                description_text = sanitized_description[0]["Descr"]
            extracted_text = self.parse_description_and_rules(description_text)
            course = {
                "_id": course_code,
                "code": course_code,
                "title": row.get("Long Title", ""),
                "credits": float(row.get("Class Units", "0")),
                "description": extracted_text["description"],
                "offeredIn": self.get_term(course_code),
                "prereqCoreqText": extracted_text["prereqCoreqText"],
                "rules": {
                    "prereq": extracted_text["prereq"],
                    "coreq": extracted_text["coreq"],
                    "not_taken": extracted_text["not_taken"]
                }
            }
            courses.append(course)

        return courses

    def get_course_description(self, course_id):
        response = self.get_from_csv("course_description", course_id=course_id)
        if not response:
            return ""
        response = response[0]
        return response.get("Descr", "")
    
    def parse_description_and_rules(self, text):
        from .course_data_scraper import make_prereq_coreq_into_array, get_not_taken
        
        if not text:
            return {
                "description": "",
                "prereqCoreqText": "",
                "prereq": [],
                "coreq": [],
                "not_taken": []
            }
        
        # Common section markers pattern - matches any section header
        section_markers = r'(?:Description:|Pre-?requisites?:|Co-?requisites?:|NOTE\d?:)'
        
        # Parse description
        description_match = re.search(r'Description:\s*(.+?)(?=' + section_markers + r'|$)', text, re.I | re.S)
        if description_match:
            description = re.sub(r'\s+', ' ', description_match.group(1).strip())
        else:
            # Use text stripped from newlines
            description = re.sub(r'\s+', ' ', text.strip())
        
        # Parse prerequisites - stop at any other section marker
        prereq_match = re.search(r'Pre-?requisites?[:\s]+(.+?)(?=' + section_markers + r'|$)', text, re.I | re.S)
        prereq_text = prereq_match.group(1).strip() if prereq_match else ""
        prereq_coreq_text = prereq_text
        prereq = make_prereq_coreq_into_array(prereq_text)
        
        # Parse corequisites - stop at any other section marker
        coreq_match = re.search(r'Co-?requisites?[:\s]+(.+?)(?=' + section_markers + r'|$)', text, re.I | re.S)
        coreq_text = coreq_match.group(1).strip() if coreq_match else ""
        prereq_coreq_text += " " + coreq_text
        coreq = make_prereq_coreq_into_array(coreq_text)
        
        # Parse not_taken from NOTE sections
        not_taken = get_not_taken(text)
        
        return {
            "description": description,
            "prereqCoreqText": prereq_coreq_text.strip(),
            "prereq": prereq,
            "coreq": coreq,
            "not_taken": not_taken
        }

_instance = None
def get_instance():
    global _instance
    if _instance is None:
        _instance = ConcordiaAPIUtils()
    return _instance