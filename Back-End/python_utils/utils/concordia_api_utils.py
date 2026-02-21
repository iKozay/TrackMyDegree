import sys
import pandas as pd
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from utils.web_utils import download_file
from utils.logging_utils import get_logger


TERM = ["0", "Summer", "Fall", "Fall/Winter", "Winter", "Spring (for CCCE career only)", "Summer (for CCCE career only)"]

CSV_SOURCES = {
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

    data_cache = {}

    def __init__(self, cache_dir: str):
        self.logger = get_logger("ConcordiaAPIUtils")
        self.cache_dir = cache_dir

    def download_datasets(self):
        for csv_name, csv_info in CSV_SOURCES.items():
            csv_file_path = os.path.join(self.cache_dir, f"{csv_name}.csv")
            if os.path.exists(csv_file_path):
                    self.logger.info(f"Loading {csv_name} from local cache: {csv_file_path}")
                    self.data_cache[csv_name] = pd.read_csv(csv_file_path, engine="pyarrow", encoding="utf-16")
                    continue
            self.logger.info(f"Downloading CSV dataset: {csv_name} from {csv_info['url']}")
            download_file(csv_info["url"], csv_file_path)
            self.logger.info(f"Downloaded and saved {csv_name} to {csv_file_path}")
            self.logger.info(f"Loading {csv_name} into DataFrame...")
            self.data_cache[csv_name] = pd.read_csv(csv_file_path, engine="pyarrow", encoding="utf-16")

        self.logger.info("All datasets downloaded and cached successfully.")

    def get_course_schedule(self, subject, catalog):
        response = self._get_from_csv("course_schedule", subject=subject, catalog=catalog)
        return self.format_course_schedule_response(response)

    def format_course_schedule_response(self, response):
        if not response:
            return []

        formatted_courses = []
        for course in response:
            formatted_course = {
                "courseID": course.get("Course ID", "").zfill(6),  # Pad with leading zeros to 6 digits
                "termCode": course.get("Term Code", ""),
                "session": course.get("Session", ""),
                "subject": course.get("Subject", ""),
                "catalog": course.get("Catalog Nbr", ""),
                "section": course.get("Section", ""),
                "componentCode": course.get("Component Code", ""),
                "componentDescription": course.get("Component Descr", ""),
                "classNumber": course.get("Class Nbr", ""),
                "classAssociation": course.get("Class Association", ""),
                "courseTitle": course.get("Course Title", ""),
                "topicID": course.get("Topic ID", ""),
                "topicDescription": course.get("Topic Descr", ""),
                "classStatus": course.get("Class Status", ""),
                "locationCode": course.get("Location Code", ""),
                "instructionModeCode": course.get("Instruction Mode code", ""),
                "instructionModeDescription": course.get("Instruction Mode Descr", ""),
                "meetingPatternNumber": course.get("Meeting Pattern Nbr", ""),
                "roomCode": course.get("Room Code", ""),
                "buildingCode": course.get("Building Code", ""),
                "room": course.get("Room", ""),
                "classStartTime": course.get("Class Start Time", ""),
                "classEndTime": course.get("Class End Time", ""),
                "modays": course.get("Mon", ""),
                "tuesdays": course.get("Tues", ""),
                "wednesdays": course.get("Wed", ""),
                "thursdays": course.get("Thurs", ""),
                "fridays": course.get("Fri", ""),
                "saturdays": course.get("Sat", ""),
                "sundays": course.get("Sun", ""),
                "classStartDate": course.get("Start Date (DD/MM/YYYY)", ""),
                "classEndDate": course.get("End Date (DD/MM/YYYY)", ""),
                "career": course.get("Career", ""),
                "departmentCode": course.get("Dept. Code", ""),
                "departmentDescription": course.get("Dept. Descr", ""),
                "facultyCode": course.get("Faculty Code", ""),
                "facultyDescription": course.get("Faculty Descr", ""),
                "enrollmentCapacity": course.get("Enrollment Capacity", ""),
                "currentEnrollment": course.get("Current Enrollment", ""),
                "waitlistCapacity": course.get("Waitlist Capacity", ""),
                "currentWaitlistTotal": course.get("Current Waitlist Total", ""),
                "hasSeatReserved": course.get("Has some/all seats reserved?", "")
            }
            formatted_courses.append(formatted_course)
        
        return formatted_courses

    def get_term(self, course_code):
        subject_and_catalog = course_code.split()
        terms = []

        response = self._get_from_csv("course_section", subject=subject_and_catalog[0], catalog=subject_and_catalog[1])
        # Fall back to course_schedule if no data found in course_section
        if response == []:
            response = self._get_from_csv("course_schedule", subject=subject_and_catalog[0], catalog=subject_and_catalog[1])

        for dict in response:
            term_int = int(dict["Term Code"])
            for i in range(3):
                term_int = term_int % pow(10, 3-i)
            
            terms.append(TERM[term_int])
        return list(set(terms))

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

    def _get_from_csv(self, csv_name, subject=None, catalog=None):
        df = self.data_cache.get(csv_name)

        if subject is not None and catalog is not None:
            matches = df[(df[CSV_SOURCES[csv_name]["subject_col"]] == subject) & 
                        (df[CSV_SOURCES[csv_name]["catalog_col"]] == catalog)]
        else:
            matches = pd.DataFrame()

        if matches.empty:
            return []

        records = matches.to_dict('records')
        return self._sanitize_data(records)

concordia_api_instance: ConcordiaAPIUtils = None
def init_concordia_api_instance(cache_dir: str) -> None:
    global concordia_api_instance
    concordia_api_instance = ConcordiaAPIUtils(cache_dir=cache_dir)

def get_concordia_api_instance() -> ConcordiaAPIUtils:
    global concordia_api_instance
    if concordia_api_instance is None:
        raise RuntimeError("ConcordiaAPIUtils instance not initialized. Call init_concordia_api_instance() first.")
    return concordia_api_instance