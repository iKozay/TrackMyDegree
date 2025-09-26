from bs4 import BeautifulSoup
import json
import requests

#----------------------------------
#This CUSTOM SCRAPER is in fact the scraper for scraping English as a Second Language (ESL) courses.
#----------------------------------

url="https://www.concordia.ca/academics/undergraduate/calendar/current/section-31-faculty-of-arts-and-science/section-31-090-department-of-education/english-as-a-second-language-courses.html#18944"

response = requests.get(url)

if response.status_code != 200:
    print(f"Failed to fetch the webpage. Status code: {response.status_code}")
    exit()

# Use response.content to retain raw bytes for proper decoding
soup = BeautifulSoup(response.content, 'html.parser')

courses = []
course_blocks = soup.find_all('div', class_='course')

for block in course_blocks:
    try:
        title_element = block.find('h3', class_='accordion-header xlarge')
        if title_element:
            # Replace non-breaking hyphen (U+2011) with standard dash
            title_text = title_element.get_text(strip=True).replace('\u2011', '-')
            title_parts = title_text.split('(')
            title = title_parts[0].strip()
            try:
                credits_raw = title_parts[1].replace('credits', '').replace(')', '').strip()
                credits = float(credits_raw) if '.' in credits_raw else int(credits_raw)
            except ValueError:
                credits = None
        else:
            title = None
            credits = None

        # Extract the description with proper spacing and punctuation
        description_element = block.find('div', class_='accordion-body')
        if description_element:
            full_text = ""
            for element in description_element:
                if element.name == "a":  # Handle hyperlinks
                    full_text += f" {element.get_text(strip=True)} "  # Add spaces around hyperlinks
                else:  # Handle regular text and punctuation
                    text = element.get_text(strip=False)  # Preserve spaces and punctuation
                    full_text += text
            full_text = " ".join(full_text.split())  # Clean up extra spaces
        else:
            full_text = ""

        # Extract prerequisites as a single block of text
        prereq_text = ""
        if "Prerequisite/Corequisite:" in full_text:
            prereq_start = full_text.find("Prerequisite/Corequisite:") + len("Prerequisite/Corequisite:")
            prereq_end = full_text.find("Description:", prereq_start)
            prereq_text = full_text[prereq_start:prereq_end].strip()

        # Extract description
        description = ""
        if "Description:" in full_text:
            desc_start = full_text.find("Description:") + len("Description:")
            desc_end = full_text.find("Component(s):", desc_start)
            description = full_text[desc_start:desc_end].strip() if desc_end != -1 else full_text[desc_start:].strip()

        # Extract components
        components = None
        if "Component(s):" in full_text:
            comp_start = full_text.find("Component(s):") + len("Component(s):")
            comp_end = full_text.find("Notes:", comp_start)
            components = full_text[comp_start:comp_end].strip() if comp_end != -1 else full_text[comp_start:].strip()

        # Extract notes
        notes = None
        if "Notes:" in full_text:
            notes_start = full_text.find("Notes:") + len("Notes:")
            notes = full_text[notes_start:].strip()

        # Prepare the course data
        course_data = {
            "title": title,
            "credits": credits,
            "prerequisites": prereq_text,  # All prerequisites/corequisites text goes here
            "corequisites": "",  # Leave corequisites empty for manual handling
            "description": description,
            "components": components,
            "notes": notes
        }

        # Append to the courses list
        courses.append(course_data)

    except Exception as e:
        print(f"Error processing course block: {e}")

# Save the data to a JSON file
output_path = 'esl_courses.json'
with open(output_path, 'w', encoding='utf-8') as json_file:
    json.dump(courses, json_file, indent=4, ensure_ascii=False)
#The course data for ESL courses are not displayed in course data/Scraping/course-lists/esl_courses.json. It could be the testing data set does not include
#students who has ESL courses in their degree plan, so the scraper did not run.

print(f"Scraped data has been saved to {output_path}")