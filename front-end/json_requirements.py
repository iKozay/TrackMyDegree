import json
import os

# Directory containing the JSON files
json_files_directory = '/home/jcjc1233/TrackMyDegree/front-end/GeneralElectives'  # Replace with the actual path

# Path to the new output text file
output_file_path = 'course_requirements_new.txt'

# Sections in the text file where course codes will be added
sections = {
    "[ECP Core]": [],
    "[General Education Humanities and Social Sciences Electives (6 credits)]": [],
    "[Natural Science Electives (6 credits)]": []
}

# Iterate through JSON files in the directory
for filename in os.listdir(json_files_directory):
    if filename.endswith('.json'):
        file_path = os.path.join(json_files_directory, filename)
        with open(file_path, 'r') as json_file:
            data = json.load(json_file)
            for course in data:
                title = course.get('title')
                if title:
                    # Extract only the course code (e.g., "GEOL 203")
                    course_code = ' '.join(title.split()[:2])  # Split and take the first two parts
                    # Add the course code to the appropriate section
                    if "MATH" in course_code or "CHEM" in course_code or "PHYS" in course_code:
                        sections["[ECP Core]"].append(course_code)
                    elif "BIOL" in course_code or "GEOL" in course_code or "PHYS" in course_code:
                        sections["[Natural Science Electives (6 credits)]"].append(course_code)
                    else:
                        sections["[General Education Humanities and Social Sciences Electives (6 credits)]"].append(course_code)

# Remove duplicates from each section
for section in sections:
    sections[section] = list(set(sections[section]))

# Write the content to a new text file
with open(output_file_path, 'w') as file:
    for section, courses in sections.items():
        file.write(section + '\n')
        for course in sorted(courses):  # Sort courses alphabetically
            file.write(course + '\n')
        file.write('\n')  # Add a blank line between sections

print(f"Course codes have been written to {output_file_path}.")