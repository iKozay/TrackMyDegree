import sys
import os
from unittest.mock import patch
from fastapi.testclient import TestClient
from io import BytesIO
from main import app

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

client = TestClient(app)

class TestParseTranscript:
    @patch('main.parse_transcript')
    def test_parse_transcript_success(self, mock_parse):
        """Test successful transcript parsing returns 200"""
        # Mock successful parsing result
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
        
        # Create fake PDF content
        pdf_content = b"%PDF-1.4 fake pdf content"
        files = {"file": ("test.pdf", BytesIO(pdf_content), "application/pdf")}
        
        response = client.post("/parse-transcript", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert 'parsed_data' in data
        assert data['parsed_data']['programInfo']['degree'] == 'Bachelor of Engineering, Software Engineering'
        mock_parse.assert_called_once()

    @patch('main.parse_transcript')
    def test_parse_transcript_failure(self, mock_parse):
        """Test transcript parsing failure returns 500"""
        # Mock parsing exception
        mock_parse.side_effect = Exception("PyMuPDF parsing error")
        
        # Create fake PDF content
        pdf_content = b"%PDF-1.4 fake pdf content"
        files = {"file": ("test.pdf", BytesIO(pdf_content), "application/pdf")}
        
        response = client.post("/parse-transcript", files=files)
        
        assert response.status_code == 500
        data = response.json()
        assert 'detail' in data
        assert 'PyMuPDF parsing error' in data['detail']
        mock_parse.assert_called_once()

    def test_parse_transcript_invalid_file_type(self):
        """Test uploading non-PDF file returns 400"""
        # Create fake text file
        text_content = b"This is not a PDF file"
        files = {"file": ("test.txt", BytesIO(text_content), "text/plain")}
        
        response = client.post("/parse-transcript", files=files)
        
        assert response.status_code == 400
        data = response.json()
        assert 'detail' in data
        assert 'must be a PDF' in data['detail']

class TestScrapeDegree:
    @patch('main.scrape_degree')
    def test_scrape_degree_success(self, mock_scrape):
        """Test successful degree scraping returns 200"""
        # Mock successful scraping result
        mock_scrape.return_value = {
            "degree": {"name": "BEng in Computer Engineering"},
            "course_pool": [{"name": "Course Pool 1"}],
            "courses": [{"code": "ELEC 275"}]
        }
        
        url = "http://example.com/degree-requirements"
        response = client.get("/scrape-degree", params={"url": url})
        
        assert response.status_code == 200
        data = response.json()
        assert data['degree']['name'] == 'BEng in Computer Engineering'
        assert data['course_pool'][0]['name'] == 'Course Pool 1'
        assert data['courses'][0]['code'] == 'ELEC 275'
        mock_scrape.assert_called_once_with(url)

    @patch('main.scrape_degree')
    def test_scrape_degree_failure(self, mock_scrape):
        """Test degree scraping failure returns 500"""
        # Mock scraping exception
        mock_scrape.side_effect = Exception("Scraping error")
        
        url = "http://example.com/degree-requirements"
        response = client.get("/scrape-degree", params={"url": url})
        
        assert response.status_code == 500
        data = response.json()
        assert 'detail' in data
        assert 'Scraping error' in data['detail']
        mock_scrape.assert_called_once_with(url)
