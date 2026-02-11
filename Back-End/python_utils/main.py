from flask import Flask, request, jsonify
import sys
import os
import threading
from dotenv import load_dotenv
from parser.transcript_parser import parse_transcript
from scraper.degree_data_scraper import DegreeDataScraper
from scraper.course_data_scraper import CourseDataScraper
from scraper.concordia_api_utils import get_instance
from models import serialize
from utils.logging_utils import get_logger

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

@app.route('/health', methods=['GET'])
def health_check():
    modules = module_status.copy()
    overall_status = "ready" if all(status == "ready" for status in modules.values()) else "init"
    
    return jsonify({
        "status": overall_status,
        "modules": modules
    })

def init_instances():
    global course_scraper_instance, degree_data_scraper_instance, concordia_api_instance
    
    try:
        # Step 1: Initialize Concordia API
        logger.info("Initializing Concordia API...")
        concordia_api_instance = get_instance()
        logger.info("Downloading Concordia API datasets...")
        concordia_api_instance.download_cache()
        logger.info("Concordia API instance created")
        
        module_status["concordia_api"] = "ready"
        
        # Step 2: Initialize Course Data Scraper  
        logger.info("Initializing Course Data Scraper...")
        course_scraper_instance = CourseDataScraper(dev_mode=dev_mode)
        if dev_mode:
            course_scraper_instance.load_cache_from_file()
        else:
            course_scraper_instance.scrape_all_courses()
        logger.info("Course scraper instance created")
        
        # Scrape all courses in production mode
        if not dev_mode:
            logger.info("Scraping all courses (production mode)...")
            course_scraper_instance.scrape_all_courses()
            logger.info("Course data scraped and cached")
        
        module_status["course_scraper"] = "ready"
        
        # Step 3: Initialize Degree Data Scraper
        logger.info("Initializing Degree Data Scraper...")
        degree_data_scraper_instance = DegreeDataScraper()
        logger.info("Degree scraper instance created")
        
        module_status["degree_scraper"] = "ready"
        
        logger.info("All modules initialized successfully")
        
    except Exception as e:
        logger.error(f"Error during initialization: {e}")
        # Mark failed modules - here we'd need more granular error handling
        # For now, just log the error

def start_async_initialization():
    """Start initialization in a background thread"""
    logger.info("Background initialization started...")
    init_thread = threading.Thread(target=init_instances, daemon=True)
    init_thread.start()

def main():
    # Only start initialization in the main reloader process, not the initial process
    # In development mode, Flask restarts the app, so we only want to init once
    if not dev_mode or os.environ.get('WERKZEUG_RUN_MAIN'):
        start_async_initialization()
    
    if dev_mode:
        logger.info("Starting development server...")
        load_dotenv("../../secrets/.env")
        app.run(host="0.0.0.0", port=15001, debug=True)
    else:
        logger.info("Starting production server...")
        app.run(host="0.0.0.0", port=15001, debug=False, threaded=True)

if __name__ == "__main__":
    main()