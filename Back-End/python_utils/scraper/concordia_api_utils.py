import sys
import requests
import pandas as pd
import tempfile
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

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
                
            temp_dir = tempfile.gettempdir()
            csv_file_path = os.path.join(temp_dir, f"{csv_name}.csv")
            print(f"Downloading cache for {csv_name}...")
            # Download the CSV file if not already downloaded
            response = requests.get(csv_info["url"], stream=True)
            response.raise_for_status()
            # Save to temp directory
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

_instance = None
def get_instance():
    global _instance
    if _instance is None:
        _instance = ConcordiaAPIUtils()
    return _instance