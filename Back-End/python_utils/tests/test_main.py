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

class TestInitInstances:
    def setup_method(self):
        # Ensure module globals are reset before each test
        import main as main_module
        main_module.course_scraper_instance = None
        main_module.degree_data_scraper_instance = None
        main_module.concordia_api_instance = None

    def test_init(self):
        """Test successful initialization"""
        import main as main_module
        with app.test_client() as client:
            with patch('main.ConcordiaAPIUtils') as mock_concordia_cls, \
                 patch('main.CourseDataScraper') as mock_course_cls, \
                 patch('main.DegreeDataScraper') as mock_degree_cls:
                with patch.object(main_module, 'dev_mode', False):
                    conc_instance = mock_concordia_cls.return_value
                    course_instance = mock_course_cls.return_value
                    degree_instance = mock_degree_cls.return_value

                    response = client.get('/init')

                    assert response.status_code == 200
                    data = response.get_json()
                    assert data['message'] == 'All modules initialized successfully'
                    assert data['module_status']['concordia_api'] == 'ready'
                    assert data['module_status']['course_scraper'] == 'ready'
                    assert data['module_status']['degree_scraper'] == 'ready'

                    mock_concordia_cls.assert_called_once_with(dev_mode=False)
                    conc_instance.download_datasets.assert_called_once()
                    mock_course_cls.assert_called_once_with(dev_mode=False)
                    course_instance.scrape_all_courses.assert_called_once()
                    course_instance.load_cache_from_file.assert_not_called()
                    mock_degree_cls.assert_called_once()

    def test_init_failure_returns_500(self):
        with app.test_client() as client:
            with patch('main.ConcordiaAPIUtils') as mock_concordia_cls:
                # Make download fail
                conc_instance = mock_concordia_cls.return_value
                conc_instance.download_datasets.side_effect = Exception("Download failed")

                response = client.get('/init')

                assert response.status_code == 500
                data = response.get_json()
                assert 'error' in data
                assert 'Initialization failed' in data['error']
                assert 'Download failed' in data['error']