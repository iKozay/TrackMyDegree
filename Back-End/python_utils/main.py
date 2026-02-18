from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
from parser.transcript_parser import parse_transcript
from scraper.degree_data_scraper import DegreeDataScraper
from scraper.course_data_scraper import init_course_scraper_instance, get_course_scraper_instance
from utils.concordia_api_utils import init_concordia_api_instance, get_concordia_api_instance
from utils.logging_utils import get_logger
from models import serialize

app = Flask(__name__)
logger = get_logger("MainApp")
initialized = False

# Global variables
course_scraper_instance = None
degree_data_scraper_instance = None
concordia_api_instance = None

# Module status tracking
module_status = {
    "concordia_api": "init",
    "course_scraper": "init", 
    "degree_scraper": "init"
}

@app.route('/parse-transcript', methods=['POST'])
def parse_transcript_api():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Uploaded file must be a PDF"}), 400

    try:
        pdf_bytes = file.read()
        parsed_data = parse_transcript(pdf_bytes)
        return jsonify(parsed_data)
    except Exception as e:
        logger.error(f"Error parsing transcript: {str(e)}")
        return jsonify({"error": f"Error parsing transcript: {str(e)}"}), 500

@app.route('/degree-names', methods=['GET'])
def get_degree_names():
    if degree_data_scraper_instance is None:
        return jsonify({"error": "Degree scraper not initialized yet"}), 503

    try:
        degree_data = degree_data_scraper_instance.get_degree_names()
        return jsonify(serialize(degree_data))
    except Exception as e:
        logger.error(f"Error retrieving degree names: {str(e)}")
        return jsonify({"error": f"Error scraping degree data: {str(e)}"}), 500

@app.route('/scrape-degree', methods=['GET'])
def scrape_degree_api():
    if degree_data_scraper_instance is None:
        return jsonify({"error": "Degree scraper not initialized yet"}), 503

    name = request.args.get('name')
    if not name:
        return jsonify({"error": "Degree name parameter is required"}), 400    
    
    try:
        degree_data = degree_data_scraper_instance.scrape_degree_by_name(name)
        return jsonify(serialize(degree_data))
    except Exception as e:
        logger.error(f"Error scraping degree data for degree name {name}: {str(e)}")
        return jsonify({"error": f"Error scraping degree data: {str(e)}"}), 500

@app.route('/scrape-all-degrees', methods=['GET'])
def scrape_all_degrees_api():
    if degree_data_scraper_instance is None:
        return jsonify({"error": "Degree scraper not initialized yet"}), 503
    
    try:
        degree_data = degree_data_scraper_instance.scrape_all_degrees()
        return jsonify(serialize(degree_data))
    except Exception as e:
        logger.error(f"Error scraping all degree data: {str(e)}")
        return jsonify({"error": f"Error scraping degree data: {str(e)}"}), 500


@app.route('/get-course', methods=['GET'])
def get_course_api():
    if course_scraper_instance is None:
        return jsonify({"error": "Course scraper not initialized yet"}), 503

    code = request.args.get('code')
    if not code:
        return jsonify({"error": "Course code parameter is required"}), 400
    
    try:
        course_data = course_scraper_instance.get_courses_by_ids([code], return_full_object=True)[0]
        return jsonify(serialize(course_data))
    except Exception as e:
        logger.error(f"Error retrieving course data for code {code}: {str(e)}")
        return jsonify({"error": f"Error retrieving course data: {str(e)}"}), 500

@app.route('/get-all-courses', methods=['GET'])
def get_all_courses_api():
    if course_scraper_instance is None:
        return jsonify({"error": "Course scraper not initialized yet"}), 503
        
    try:
        courses = course_scraper_instance.get_all_courses(return_full_object=True)
        return jsonify(serialize(courses))
    except Exception as e:
        logger.error(f"Error retrieving all courses: {str(e)}")
        return jsonify({"error": f"Error retrieving course data: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"})

@app.before_request
def run_init():
    global initialized

    # Skip specific route
    if request.endpoint == "parse_transcript_api":
        return

    if not initialized:
        init_instances()
        initialized = True

def init_instances():
    global course_scraper_instance, degree_data_scraper_instance, concordia_api_instance

    # Step 1: Initialize Concordia API
    if concordia_api_instance is None:
        logger.info("Initializing Concordia API...")
        init_concordia_api_instance(cache_dir=cache_path)
        concordia_api_instance = get_concordia_api_instance()
        concordia_api_instance.download_datasets()
        logger.info("Concordia API instance created")    
        module_status["concordia_api"] = "ready"
    
    # Step 2: Initialize Course Data Scraper  
    if course_scraper_instance is None:
        logger.info("Initializing Course Data Scraper...")
        init_course_scraper_instance(cache_dir=cache_path)
        course_scraper_instance = get_course_scraper_instance()
        course_scraper_instance.load_cache_from_file()
        logger.info("Course scraper instance created")
        module_status["course_scraper"] = "ready"
    
    # Step 3: Initialize Degree Data Scraper
    if degree_data_scraper_instance is None:
        logger.info("Initializing Degree Data Scraper...")
        degree_data_scraper_instance = DegreeDataScraper()
        logger.info("Degree scraper instance created")        
        module_status["degree_scraper"] = "ready"
    
    logger.info("All modules initialized successfully")

# Initialize configuration
def get_config():
    data_cache = os.getenv("DATA_CACHE", os.path.abspath(os.path.join(os.path.dirname(__file__), "../data")))
    env_file = os.getenv("ENV_FILE", os.path.join(os.path.dirname(__file__), "../../secrets/.env"))
    return data_cache, env_file

cache_path, env_file = get_config()
if cache_path:
    os.makedirs(cache_path, exist_ok=True)
if env_file:
    load_dotenv(env_file)

def main():
    app.run(host="0.0.0.0", port=15001)

if __name__ == "__main__":
    main()