from flask import Flask, request, jsonify
import sys
from dotenv import load_dotenv
from parser.transcript_parser import parse_transcript
from scraper.degree_data_scraper import DegreeDataScraper
from scraper.course_data_scraper import CourseDataScraper
from utils.concordia_api_utils import ConcordiaAPIUtils
from utils.logging_utils import get_logger
from models import serialize

app = Flask(__name__)
logger = get_logger("MainApp")
dev_mode = ("--dev" in sys.argv)

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
        return jsonify({"error": f"Error parsing transcript: {str(e)}"}), 500

@app.route('/degree-names', methods=['GET'])
def get_degree_names():
    if degree_data_scraper_instance is None:
        return jsonify({"error": "Degree scraper not initialized yet"}), 503

    try:
        degree_data = degree_data_scraper_instance.get_degree_names()
        return jsonify(serialize(degree_data))
    except Exception as e:
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
        return jsonify({"error": f"Error scraping degree data: {str(e)}"}), 500

@app.route('/scrape-all-degrees', methods=['GET'])
def scrape_all_degrees_api():
    if degree_data_scraper_instance is None:
        return jsonify({"error": "Degree scraper not initialized yet"}), 503
    
    try:
        degree_data = degree_data_scraper_instance.scrape_all_degrees()
        return jsonify(serialize(degree_data))
    except Exception as e:
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
        return jsonify({"error": f"Error retrieving course data: {str(e)}"}), 500

@app.route('/get-all-courses', methods=['GET'])
def get_all_courses_api():
    if course_scraper_instance is None:
        return jsonify({"error": "Course scraper not initialized yet"}), 503
        
    try:
        courses = course_scraper_instance.get_all_courses(return_full_object=True)
        return jsonify(serialize(courses))
    except Exception as e:
        return jsonify({"error": f"Error retrieving course data: {str(e)}"}), 500

@app.route('/init', methods=['GET'])
def init_instances():
    global course_scraper_instance, degree_data_scraper_instance, concordia_api_instance
    
    try:
        # Step 1: Initialize Concordia API
        if concordia_api_instance is None:
            logger.info("Initializing Concordia API...")
            concordia_api_instance = ConcordiaAPIUtils(dev_mode=dev_mode)
            concordia_api_instance.download_datasets()
            logger.info("Concordia API instance created")    
            module_status["concordia_api"] = "ready"
        
        # Step 2: Initialize Course Data Scraper  
        if course_scraper_instance is None:
            logger.info("Initializing Course Data Scraper...")
            course_scraper_instance = CourseDataScraper(dev_mode=dev_mode)
            if dev_mode:
                course_scraper_instance.load_cache_from_file()
            else:
                course_scraper_instance.scrape_all_courses()
            logger.info("Course scraper instance created")
            module_status["course_scraper"] = "ready"
        
        # Step 3: Initialize Degree Data Scraper
        if degree_data_scraper_instance is None:
            logger.info("Initializing Degree Data Scraper...")
            degree_data_scraper_instance = DegreeDataScraper()
            logger.info("Degree scraper instance created")        
            module_status["degree_scraper"] = "ready"
        
        logger.info("All modules initialized successfully")

        return jsonify({"message": "All modules initialized successfully", "module_status": module_status})
    except Exception as e:
        logger.error(f"Error during initialization: {e}")
        return jsonify({"error": f"Initialization failed: {str(e)}"}), 500

def main():
    if dev_mode:
        logger.info("Starting development server...")
        load_dotenv("../../secrets/.env")
    else:
        logger.info("Starting production server...")
    app.run(host="0.0.0.0", port=15001, threaded=True)

if __name__ == "__main__":
    main()