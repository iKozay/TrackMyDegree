import requests
from bs4 import BeautifulSoup

def scrape_course_codes(url):
    # Send an HTTP GET request
    response = requests.get(url)
    response.raise_for_status()  # Raises HTTPError if status != 200

    # Parse HTML content
    soup = BeautifulSoup(response.text, 'html.parser')

    # Find all span elements with the class "course-code-number"
    code_spans = soup.find_all("span", class_="course-code-number")

    # Extract the text from each span
    course_codes = [span.get_text(strip=True) for span in code_spans]

    return course_codes

if __name__ == "__main__":
    # Replace with the actual URL
    url = (
        "https://www.concordia.ca/academics/undergraduate/calendar/current/"
        "section-71-gina-cody-school-of-engineering-and-computer-science/"
        "section-71-70-department-of-computer-science-and-software-engineering/"
        "section-71-70-2-degree-requirements-bcompsc-.html#18054"
    )

    codes = scrape_course_codes(url)

    # Print each code to console
    for code in codes:
        print(code)

    # Save the codes to a plain text file (no quotes)
    with open('course_codes.txt', 'w', encoding='utf-8') as f:
        for code in codes:
            f.write(code + '\n')
