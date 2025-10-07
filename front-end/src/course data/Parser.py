from bs4 import BeautifulSoup
import json
import re

#This Parser is implemented multiple times in different folders: Course Data, Back-End, Front-End. 
#This should be cleaned up in the future.

# Read the HTML content from a file
with open('scraped_page.html', 'r', encoding='utf-8') as file:
    html_content = file.read()

# Parse the HTML content using BeautifulSoup
soup = BeautifulSoup(html_content, 'html.parser')

# Find all course containers
courses = soup.find_all('div', class_='course')

# Prepare a list to hold course data
course_data = []

# Loop through each course and extract information
for course in courses:
    # Extract the course title
    title_tag = course.find('div', class_='title')
    title = title_tag.get_text(strip=True) if title_tag else 'No title found'
    
    # Extract the number of credits from the title
    credits_match = re.search(r'\((\d+) credits?\)', title)
    credits = int(credits_match.group(1)) if credits_match else 0
    
    # Remove the credits from the title
    title = re.sub(r'\s*\(\d+ credits?\)', '', title)
    
    # Extract different parts of the course description
    accordion_body = course.find('div', class_='accordion-body')
    
    if accordion_body:
        # Initialize variables
        prereq_text = ''
        description_text = ''
        components_text = ''
        notes_text = ''
        
        # Initialize variables for parsing
        sections = {}
        current_section = None
        
        # Get all child elements in accordion_body
        for element in accordion_body.contents:
            if element.name == 'h4':
                current_section = element.get_text(strip=True).rstrip(':')
                sections[current_section] = ''
            elif element.name in ['p', 'span', 'div', 'ul', 'ol'] or isinstance(element, str):
                text = ''
                if isinstance(element, str):
                    # This is a NavigableString, directly under accordion_body
                    text = element.strip()
                else:
                    text = element.get_text(separator=' ', strip=True)
                if text:
                    if current_section:
                        sections[current_section] += ' ' + text
                    else:
                        # No current section, assume description
                        if 'Description' in sections:
                            sections['Description'] += ' ' + text
                        else:
                            sections['Description'] = text
            else:
                # Ignore other elements
                continue
        
        # Handle notes from 'course-notes' class
        course_notes = accordion_body.find('ul', class_='course-notes')
        if course_notes:
            notes_items = course_notes.find_all('li')
            notes_list = [item.get_text(strip=True) for item in notes_items]
            notes_text = ' '.join(notes_list)
        else:
            # Get notes from the 'Notes' section if available
            notes_text = sections.get('Notes', '').strip()

        # Assign content to variables if they exist
        prereq_text = sections.get('Prerequisite/Corequisite', '').strip()
        description_text = sections.get('Description', '').strip()
        components_text = sections.get('Component(s)', '').strip()
    else:
        prereq_text = description_text = components_text = notes_text = ''
    
    # Parse prerequisites and corequisites
    prereq_match = re.search(r'The following course.*?: (.*?)\.', prereq_text)
    coreq_match = re.search(r'The following courses must be completed previously or concurrently: (.*?)\.', prereq_text)
    prerequisites = prereq_match.group(1) if prereq_match else ''
    corequisites = coreq_match.group(1) if coreq_match else ''
    
    # Append the course info to the list
    course_info = {
        'title': title,
        'credits': credits,
        'prerequisites': prerequisites,
        'corequisites': corequisites,
        'description': description_text,
        'components': components_text,
        'notes': notes_text
    }
    course_data.append(course_info)

# Save the data to a JSON file
with open('courses.json', 'w', encoding='utf-8') as f:
    json.dump(course_data, f, ensure_ascii=False, indent=4)

print("Course data has been saved to courses.json")
