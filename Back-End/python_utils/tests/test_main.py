import sys
import os
from unittest.mock import patch, MagicMock
from io import BytesIO
from main import app

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class TestParseTranscript:
    def test_parse_transcript_success(self):
        """Test successful transcript parsing returns 200"""
        with app.test_client() as client:
            with patch('main.parse_transcript') as mock_parse:
                mock_parse.return_value = {
                    'programInfo': {'degree': 'Bachelor of Engineering, Software Engineering'},
                    'semesters': [
                        {
                            'term': 'Fall 2023',
                            'courses': [{'code': 'COMP232', 'grade': 'A'}]
                        }
                    ],
                    'transferedCourses': [],
                    'exemptedCourses': [],
                    'deficiencyCourses': []
                }
                
                pdf_content = b"%PDF-1.4 fake pdf content"
                data = {"file": (BytesIO(pdf_content), "test.pdf")}
                
                response = client.post("/parse-transcript", data=data, content_type='multipart/form-data')
                
                assert response.status_code == 200
                data = response.get_json()
                assert data['programInfo']['degree'] == 'Bachelor of Engineering, Software Engineering'
                mock_parse.assert_called_once()

    def test_parse_transcript_no_file(self):
        """Test transcript parsing with no file returns 400"""
        with app.test_client() as client:
            response = client.post("/parse-transcript")
            
            assert response.status_code == 400
            data = response.get_json()
            assert 'error' in data
            assert 'No file provided' in data['error']

    def test_parse_transcript_invalid_file_type(self):
        """Test transcript parsing with non-PDF file returns 400"""
        with app.test_client() as client:
            text_content = b"This is not a PDF file"
            data = {"file": (BytesIO(text_content), "test.txt")}
            
            response = client.post("/parse-transcript", data=data, content_type='multipart/form-data')
            
            assert response.status_code == 400
            data = response.get_json()
            assert 'error' in data
            assert 'must be a PDF' in data['error']

    def test_parse_transcript_parsing_error(self):
        """Test transcript parsing with parsing exception returns 500"""
        with app.test_client() as client:
            with patch('main.parse_transcript') as mock_parse:
                mock_parse.side_effect = Exception("PyMuPDF parsing error")
                
                pdf_content = b"%PDF-1.4 fake pdf content"
                data = {"file": (BytesIO(pdf_content), "test.pdf")}
                
                response = client.post("/parse-transcript", data=data, content_type='multipart/form-data')
                
                assert response.status_code == 500
                data = response.get_json()
                assert 'error' in data
                assert 'PyMuPDF parsing error' in data['error']

class TestDegreeEndpoints:
    def test_get_degree_names_success(self):
        """Test successful degree names retrieval returns 200"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance') as mock_instance:
                mock_instance.get_degree_names.return_value = [
                    "Bachelor of Engineering in Computer Engineering",
                    "Bachelor of Computer Science"
                ]
                
                response = client.get("/degree-names")
                
                assert response.status_code == 200
                data = response.get_json()
                assert len(data) == 2
                assert "Computer Engineering" in data[0]
                mock_instance.get_degree_names.assert_called_once()

    def test_get_degree_names_not_initialized(self):
        """Test degree names with uninitialized scraper returns 503"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance', None):
                response = client.get("/degree-names")
                
                assert response.status_code == 503
                data = response.get_json()
                assert 'error' in data
                assert 'not initialized' in data['error']

    def test_scrape_degree_success(self):
        """Test successful degree scraping by name returns 200"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance') as mock_instance:
                mock_instance.scrape_degree_by_name.return_value = {
                    "degree": {"name": "BEng in Computer Engineering"},
                    "course_pool": [{"name": "Course Pool 1"}],
                    "courses": [{"code": "ELEC 275"}]
                }
                
                response = client.get("/scrape-degree?name=Computer Engineering")
                
                assert response.status_code == 200
                data = response.get_json()
                assert data['degree']['name'] == 'BEng in Computer Engineering'
                mock_instance.scrape_degree_by_name.assert_called_once_with("Computer Engineering")

    def test_scrape_degree_no_name_parameter(self):
        """Test degree scraping without name parameter returns 400"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance', MagicMock()):
                response = client.get("/scrape-degree")
                
                assert response.status_code == 400
                data = response.get_json()
                assert 'error' in data
                assert 'required' in data['error']

    def test_scrape_degree_not_initialized(self):
        """Test degree scraping with uninitialized scraper returns 503"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance', None):
                response = client.get("/scrape-degree?name=Test")
                
                assert response.status_code == 503
                data = response.get_json()
                assert 'error' in data
                assert 'not initialized' in data['error']

    def test_scrape_degree_error(self):
        """Test degree scraping with exception returns 500"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance') as mock_instance:
                mock_instance.scrape_degree_by_name.side_effect = Exception("Scraping failed")
                
                response = client.get("/scrape-degree?name=Test")
                
                assert response.status_code == 500
                data = response.get_json()
                assert 'error' in data
                assert 'Scraping failed' in data['error']

    def test_get_degree_names_error(self):
        """Test degree names retrieval with exception returns 500"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance') as mock_instance:
                mock_instance.get_degree_names.side_effect = Exception("Network error")
                
                response = client.get("/degree-names")
                
                assert response.status_code == 500
                data = response.get_json()
                assert 'error' in data
                assert 'Network error' in data['error']

    def test_scrape_all_degrees_success(self):
        """Test successful scraping of all degrees returns 200"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance') as mock_instance:
                mock_instance.scrape_all_degrees.return_value = {
                    "degrees": [{"name": "Computer Engineering"}]
                }
                
                response = client.get("/scrape-all-degrees")
                
                assert response.status_code == 200
                data = response.get_json()
                assert 'degrees' in data
                mock_instance.scrape_all_degrees.assert_called_once()

    def test_scrape_all_degrees_not_initialized(self):
        """Test scraping all degrees with uninitialized scraper returns 503"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance', None):
                response = client.get("/scrape-all-degrees")
                
                assert response.status_code == 503
                data = response.get_json()
                assert 'error' in data
                assert 'not initialized' in data['error']

    def test_scrape_all_degrees_error(self):
        """Test scraping all degrees with exception returns 500"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance') as mock_instance:
                mock_instance.scrape_all_degrees.side_effect = Exception("Scraping error")
                
                response = client.get("/scrape-all-degrees")
                
                assert response.status_code == 500
                data = response.get_json()
                assert 'error' in data
                assert 'Scraping error' in data['error']

class TestCourseEndpoints:
    def test_get_course_success(self):
        """Test successful course retrieval by code returns 200"""
        with app.test_client() as client:
            with patch('main.course_scraper_instance') as mock_instance:
                mock_instance.get_courses_by_ids.return_value = [{
                    "_id": "COMP 248",
                    "code": "COMP 248",
                    "title": "Object-Oriented Programming I",
                    "credits": "3.5",
                    "description": "Introduction to programming using an object oriented language.",
                    "offeredIn": ["Fall", "Winter", "Summer"],
                    "prereqCoreqText": "Prerequisite: Cegep level mathematics or MATH 203 or 204.",
                    "rules": {
                        "prereq": [["MATH 203", "MATH 204"]],
                        "coreq": [],
                        "not_taken": []
                    }
                }]
                
                response = client.get("/get-course?code=COMP 248")
                
                assert response.status_code == 200
                data = response.get_json()
                assert data["code"] == "COMP 248"
                assert data["title"] == "Object-Oriented Programming I"
                mock_instance.get_courses_by_ids.assert_called_once_with(["COMP 248"], return_full_object=True)

    def test_get_course_no_code_parameter(self):
        """Test course retrieval without code parameter returns 400"""
        with app.test_client() as client:
            with patch('main.course_scraper_instance', MagicMock()):
                response = client.get("/get-course")
                
                assert response.status_code == 400
                data = response.get_json()
                assert 'error' in data
                assert 'required' in data['error']

    def test_get_course_not_initialized(self):
        """Test course retrieval with uninitialized scraper returns 503"""
        with app.test_client() as client:
            with patch('main.course_scraper_instance', None):
                response = client.get("/get-course?code=COMP 248")
                
                assert response.status_code == 503
                data = response.get_json()
                assert 'error' in data
                assert 'not initialized' in data['error']

    def test_get_all_courses_success(self):
        """Test successful retrieval of all courses returns 200"""
        with app.test_client() as client:
            with patch('main.course_scraper_instance') as mock_instance:
                mock_instance.get_all_courses.return_value = [
                    {
                        "_id": "COMP 248",
                        "code": "COMP 248", 
                        "title": "Object-Oriented Programming I",
                        "credits": "3.5"
                    },
                    {
                        "_id": "COMP 249",
                        "code": "COMP 249",
                        "title": "Object-Oriented Programming II", 
                        "credits": "3.5"
                    }
                ]
                
                response = client.get("/get-all-courses")
                
                assert response.status_code == 200
                data = response.get_json()
                assert len(data) == 2
                assert data[0]["code"] == "COMP 248"
                assert data[1]["code"] == "COMP 249"
                mock_instance.get_all_courses.assert_called_once_with(return_full_object=True)

    def test_get_all_courses_not_initialized(self):
        """Test all courses retrieval with uninitialized scraper returns 503"""
        with app.test_client() as client:
            with patch('main.course_scraper_instance', None):
                response = client.get("/get-all-courses")
                
                assert response.status_code == 503
                data = response.get_json()
                assert 'error' in data
                assert 'not initialized' in data['error']

    def test_get_course_error(self):
        """Test course retrieval with exception returns 500"""
        with app.test_client() as client:
            with patch('main.course_scraper_instance') as mock_instance:
                mock_instance.get_courses_by_ids.side_effect = Exception("Database error")
                
                response = client.get("/get-course?code=COMP 248")
                
                assert response.status_code == 500
                data = response.get_json()
                assert 'error' in data
                assert 'Database error' in data['error']

    def test_get_course_empty_result(self):
        """Test course retrieval when no course found returns 500"""
        with app.test_client() as client:
            with patch('main.course_scraper_instance') as mock_instance:
                mock_instance.get_courses_by_ids.return_value = []
                
                response = client.get("/get-course?code=NONEXISTENT")
                
                assert response.status_code == 500
                data = response.get_json()
                assert 'error' in data

    def test_get_all_courses_error(self):
        """Test all courses retrieval with exception returns 500"""
        with app.test_client() as client:
            with patch('main.course_scraper_instance') as mock_instance:
                mock_instance.get_all_courses.side_effect = Exception("Scraping error")
                
                response = client.get("/get-all-courses")
                
                assert response.status_code == 500
                data = response.get_json()
                assert 'error' in data
                assert 'Scraping error' in data['error']


class TestHealthEndpoint:
    def test_health_check_all_ready(self):
        """Test health check when all modules are ready"""
        with app.test_client() as client:
            with patch('main.module_status', {
                "concordia_api": "ready",
                "course_scraper": "ready", 
                "degree_scraper": "ready"
            }):
                response = client.get("/health")
                
                assert response.status_code == 200
                data = response.get_json()
                assert data["status"] == "ready"
                assert data["modules"]["concordia_api"] == "ready"
                assert data["modules"]["course_scraper"] == "ready"
                assert data["modules"]["degree_scraper"] == "ready"

    def test_health_check_initializing(self):
        """Test health check when modules are still initializing"""
        with app.test_client() as client:
            with patch('main.module_status', {
                "concordia_api": "ready",
                "course_scraper": "init", 
                "degree_scraper": "ready"
            }):
                response = client.get("/health")
                
                assert response.status_code == 200
                data = response.get_json()
                assert data["status"] == "init"
                assert data["modules"]["course_scraper"] == "init"


class TestInitialization:
    @patch('main.logger')
    @patch('main.get_instance')
    @patch('main.CourseDataScraper')
    @patch('main.DegreeDataScraper')
    def test_init_instances_success(self, mock_degree_scraper, mock_course_scraper, mock_get_instance, mock_logger):
        """Test successful initialization of all instances"""
        # Mock the instances
        mock_concordia_api = MagicMock()
        mock_get_instance.return_value = mock_concordia_api
        
        mock_course_scraper_inst = MagicMock()
        mock_course_scraper.return_value = mock_course_scraper_inst
        
        mock_degree_scraper_inst = MagicMock()
        mock_degree_scraper.return_value = mock_degree_scraper_inst
        
        # Import and call init_instances
        from main import init_instances
        init_instances()
        
        # Verify initialization calls
        mock_get_instance.assert_called_once()
        mock_concordia_api.download_cache.assert_called_once()
        mock_course_scraper.assert_called_once()
        mock_degree_scraper.assert_called_once()

    @patch('main.logger')
    @patch('main.get_instance')
    def test_init_instances_concordia_api_error(self, mock_get_instance, mock_logger):
        """Test initialization with Concordia API error"""
        mock_get_instance.side_effect = Exception("API connection failed")
        
        from main import init_instances
        init_instances()  # Should not raise exception
        
        mock_logger.error.assert_called()

    @patch('main.logger')
    @patch('main.get_instance')
    @patch('main.CourseDataScraper')
    def test_init_instances_course_scraper_error(self, mock_course_scraper, mock_get_instance, mock_logger):
        """Test initialization with course scraper error"""
        mock_concordia_api = MagicMock()
        mock_get_instance.return_value = mock_concordia_api
        mock_course_scraper.side_effect = Exception("Course scraper failed")
        
        from main import init_instances
        init_instances()  # Should not raise exception
        
        mock_logger.error.assert_called()

    @patch('main.logger')
    @patch('main.get_instance')
    @patch('main.CourseDataScraper')
    @patch('main.DegreeDataScraper')
    def test_init_instances_degree_scraper_error(self, mock_degree_scraper, mock_course_scraper, mock_get_instance, mock_logger):
        """Test initialization with degree scraper error"""
        mock_concordia_api = MagicMock()
        mock_get_instance.return_value = mock_concordia_api
        
        mock_course_scraper_inst = MagicMock()
        mock_course_scraper.return_value = mock_course_scraper_inst
        
        mock_degree_scraper.side_effect = Exception("Degree scraper failed")
        
        from main import init_instances
        init_instances()  # Should not raise exception
        
        mock_logger.error.assert_called()

    @patch('main.threading.Thread')
    def test_start_async_initialization(self, mock_thread):
        """Test starting async initialization"""
        mock_thread_inst = MagicMock()
        mock_thread.return_value = mock_thread_inst
        
        from main import start_async_initialization
        start_async_initialization()
        
        mock_thread.assert_called_once()
        mock_thread_inst.start.assert_called_once()

    @patch('main.logger')
    @patch('main.get_instance')
    @patch('main.CourseDataScraper')
    @patch('main.DegreeDataScraper')
    @patch('main.dev_mode', False)
    def test_init_instances_production_mode(self, mock_degree_scraper, mock_course_scraper, mock_get_instance, mock_logger):
        """Test initialization in production mode with course scraping"""
        # Mock the instances
        mock_concordia_api = MagicMock()
        mock_get_instance.return_value = mock_concordia_api
        
        mock_course_scraper_inst = MagicMock()
        mock_course_scraper.return_value = mock_course_scraper_inst
        
        mock_degree_scraper_inst = MagicMock()
        mock_degree_scraper.return_value = mock_degree_scraper_inst
        
        # Import and call init_instances
        from main import init_instances
        init_instances()
        
        # Verify production mode calls scrape_all_courses twice
        assert mock_course_scraper_inst.scrape_all_courses.call_count == 2
        mock_degree_scraper.assert_called_once()

class TestMain:
    @patch('main.app.run')
    @patch('main.start_async_initialization')
    @patch('main.dev_mode', True)
    def test_main_dev_mode(self, mock_start_init, mock_app_run):
        """Test main function in development mode"""
        with patch.dict(os.environ, {'WERKZEUG_RUN_MAIN': 'true'}):
            from main import main
            main()
            mock_start_init.assert_called_once()
            mock_app_run.assert_called_once_with(host="0.0.0.0", port=15001, debug=True)

    @patch('main.app.run')
    @patch('main.start_async_initialization')
    @patch('main.dev_mode', True)
    def test_main_dev_mode_no_werkzeug(self, mock_start_init, mock_app_run):
        """Test main function in dev mode without WERKZEUG_RUN_MAIN"""
        with patch.dict(os.environ, {}, clear=True):
            from main import main
            main()
            mock_start_init.assert_not_called()
            mock_app_run.assert_called_once_with(host="0.0.0.0", port=15001, debug=True)

    @patch('main.app.run')
    @patch('main.start_async_initialization')
    @patch('main.load_dotenv')
    @patch('main.dev_mode', True)
    def test_main_dev_mode_loads_env(self, mock_load_dotenv, mock_start_init, mock_app_run):
        """Test main function loads .env in dev mode"""
        with patch.dict(os.environ, {'WERKZEUG_RUN_MAIN': 'true'}):
            from main import main
            main()
            mock_load_dotenv.assert_called_once_with("../../secrets/.env")

    @patch('main.app.run')
    @patch('main.start_async_initialization')
    def test_main_production_mode(self, mock_start_init, mock_app_run):
        """Test main function in production mode"""
        test_args = ['main.py']
        with patch.object(sys, 'argv', test_args):
            from main import main
            main()
            mock_start_init.assert_called_once()
            mock_app_run.assert_called_once_with(host="0.0.0.0", port=15001, debug=False, threaded=True)