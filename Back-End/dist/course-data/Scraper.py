from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

# Set up Chrome options for headless browsing
chrome_options = Options()
chrome_options.add_argument('--headless')  # Run browser in headless mode (no GUI)
chrome_options.add_argument('--disable-gpu')  # Disable GPU acceleration
chrome_options.add_argument('--no-sandbox')  # Bypass OS security model

# Initialize the Chrome driver using webdriver-manager
driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=chrome_options
)

try:
    # Specify the URL to scrape
    url = 'https://www.concordia.ca/academics/undergraduate/calendar/current/section-71-gina-cody-school-of-engineering-and-computer-science/section-71-70-department-of-computer-science-and-software-engineering/section-71-70-10-computer-science-and-software-engineering-courses.html'
    driver.get(url)

    # Wait for the page to fully render
    driver.implicitly_wait(10)  # seconds

    # Retrieve the page source after JavaScript has executed
    html_content = driver.page_source

    # Parse the page source with BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')

    # Optionally, perform data extraction using BeautifulSoup
    # For example, extract all hyperlinks
    links = soup.find_all('a')
    for link in links:
        print(link.get('href'))

    # Save the prettified HTML content to a file
    with open('scraped_page.html', 'w', encoding='utf-8') as file:
        file.write(soup.prettify())

    print("HTML page has been saved successfully.")

finally:
    # Close the Selenium browser session
    driver.quit()
