import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from unittest.mock import patch, MagicMock, mock_open
from io import BytesIO
import json
import time
import threading

# Mock the entire main module before importing it to prevent initialization
with patch('main.init_instances', return_value=None):
    from main import app
    import main

class TestParseTranscript:
    @patch('main.init_instances')
    def test_parse_transcript_success(self, mock_init):
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

    @patch('main.init_instances')
    def test_parse_transcript_no_file(self, mock_init):
        """Test transcript parsing with no file returns 400"""
        with app.test_client() as client:
            response = client.post("/parse-transcript")
            
            assert response.status_code == 400
            data = response.get_json()
            assert 'error' in data
            assert 'No file provided' in data['error']

    @patch('main.init_instances')
    def test_parse_transcript_invalid_file_type(self, mock_init):
        """Test transcript parsing with non-PDF file returns 400"""
        with app.test_client() as client:
            text_content = b"This is not a PDF file"
            data = {"file": (BytesIO(text_content), "test.txt")}
            
            response = client.post("/parse-transcript", data=data, content_type='multipart/form-data')
            
            assert response.status_code == 400
            data = response.get_json()
            assert 'error' in data
            assert 'must be a PDF' in data['error']

    @patch('main.init_instances')
    def test_parse_transcript_parsing_error(self, mock_init):
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

class TestDegreeEndpoints:
    @patch('main.init_instances')
    def test_get_degree_names_success(self, mock_init):
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

    @patch('main.init_instances')
    def test_get_degree_names_not_initialized(self, mock_init):
        """Test degree names with uninitialized scraper returns 503"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance', None):
                response = client.get("/degree-names")
                
                assert response.status_code == 503
                data = response.get_json()
                assert 'error' in data
                assert 'not initialized' in data['error']

    @patch('main.init_instances')
    def test_scrape_degree_success(self, mock_init):
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

    @patch('main.init_instances')
    def test_scrape_degree_no_name_parameter(self, mock_init):
        """Test degree scraping without name parameter returns 400"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance', MagicMock()):
                response = client.get("/scrape-degree")
                
                assert response.status_code == 400
                data = response.get_json()
                assert 'error' in data
                assert 'required' in data['error']

    @patch('main.init_instances')
    def test_scrape_degree_not_initialized(self, mock_init):
        """Test degree scraping with uninitialized scraper returns 503"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance', None):
                response = client.get("/scrape-degree?name=Test")
                
                assert response.status_code == 503
                data = response.get_json()
                assert 'error' in data
                assert 'not initialized' in data['error']

    @patch('main.init_instances')
    def test_scrape_degree_error(self, mock_init):
        """Test degree scraping with exception returns 500"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance') as mock_instance:
                mock_instance.scrape_degree_by_name.side_effect = Exception("Scraping failed")
                
                response = client.get("/scrape-degree?name=Test")
                
                assert response.status_code == 500
                data = response.get_json()
                assert 'error' in data

    @patch('main.init_instances')
    def test_get_degree_names_error(self, mock_init):
        """Test degree names retrieval with exception returns 500"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance') as mock_instance:
                mock_instance.get_degree_names.side_effect = Exception("Network error")
                
                response = client.get("/degree-names")
                
                assert response.status_code == 500
                data = response.get_json()
                assert 'error' in data

    @patch('main.init_instances')
    def test_scrape_all_degrees_success(self, mock_init):
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

    @patch('main.init_instances')
    def test_scrape_all_degrees_not_initialized(self, mock_init):
        """Test scraping all degrees with uninitialized scraper returns 503"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance', None):
                response = client.get("/scrape-all-degrees")
                
                assert response.status_code == 503
                data = response.get_json()
                assert 'error' in data
                assert 'not initialized' in data['error']

    @patch('main.init_instances')
    def test_scrape_all_degrees_error(self, mock_init):
        """Test scraping all degrees with exception returns 500"""
        with app.test_client() as client:
            with patch('main.degree_data_scraper_instance') as mock_instance:
                mock_instance.scrape_all_degrees.side_effect = Exception("Scraping error")
                
                response = client.get("/scrape-all-degrees")
                
                assert response.status_code == 500
                data = response.get_json()
                assert 'error' in data

class TestCourseEndpoints:
    @patch('main.init_instances')
    def test_get_course_success(self, mock_init):
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

    @patch('main.init_instances')
    def test_get_course_no_code_parameter(self, mock_init):
        """Test course retrieval without code parameter returns 400"""
        with app.test_client() as client:
            with patch('main.course_scraper_instance', MagicMock()):
                response = client.get("/get-course")
                
                assert response.status_code == 400
                data = response.get_json()
                assert 'error' in data
                assert 'required' in data['error']

    @patch('main.init_instances')
    def test_get_course_not_initialized(self, mock_init):
        """Test course retrieval with uninitialized scraper returns 503"""
        with app.test_client() as client:
            with patch('main.course_scraper_instance', None):
                response = client.get("/get-course?code=COMP 248")
                
                assert response.status_code == 503
                data = response.get_json()
                assert 'error' in data
                assert 'not initialized' in data['error']

    @patch('main.init_instances')
    def test_get_all_courses_success(self, mock_init):
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

    @patch('main.init_instances')
    def test_get_all_courses_not_initialized(self, mock_init):
        """Test all courses retrieval with uninitialized scraper returns 503"""
        with app.test_client() as client:
            with patch('main.course_scraper_instance', None):
                response = client.get("/get-all-courses")
                
                assert response.status_code == 503
                data = response.get_json()
                assert 'error' in data
                assert 'not initialized' in data['error']

    @patch('main.init_instances')
    def test_get_course_error(self, mock_init):
        """Test course retrieval with exception returns 500"""
        with app.test_client() as client:
            with patch('main.course_scraper_instance') as mock_instance:
                mock_instance.get_courses_by_ids.side_effect = Exception("Database error")
                
                response = client.get("/get-course?code=COMP 248")
                
                assert response.status_code == 500
                data = response.get_json()
                assert 'error' in data

    @patch('main.init_instances')
    def test_get_course_empty_result(self, mock_init):
        """Test course retrieval when no course found returns 500"""
        with app.test_client() as client:
            with patch('main.course_scraper_instance') as mock_instance:
                mock_instance.get_courses_by_ids.return_value = []
                
                response = client.get("/get-course?code=NONEXISTENT")
                
                assert response.status_code == 500
                data = response.get_json()
                assert 'error' in data

    @patch('main.init_instances')
    def test_get_all_courses_error(self, mock_init):
        """Test all courses retrieval with exception returns 500"""
        with app.test_client() as client:
            with patch('main.course_scraper_instance') as mock_instance:
                mock_instance.get_all_courses.side_effect = Exception("Scraping error")
                
                response = client.get("/get-all-courses")
                
                assert response.status_code == 500
                data = response.get_json()
                assert 'error' in data

class TestCourseScheduleEndpoint:

    @patch('main.init_instances')
    def test_get_course_schedule_success(self, mock_init):
        with app.test_client() as client:
            with patch('main.concordia_api_instance') as mock_instance:
                mock_instance.get_course_schedule.return_value = [
                    {
                        "courseID": "000123",
                        "subject": "COMP",
                        "catalog": "248",
                    }
                ]
                response = client.get("/get-course-schedule?subject=COMP&catalog=248")
                assert response.status_code == 200
                data = response.get_json()
                assert isinstance(data, list)
                assert len(data) == 1
                assert data[0]["courseID"] == "000123"
                assert data[0]["subject"] == "COMP"
                assert data[0]["catalog"] == "248"
                mock_instance.get_course_schedule.assert_called_once_with("COMP", "248")

class TestGetTimestampFilepath:
    def test_returns_path_with_correct_filename(self):
        """Test that the returned path ends with the expected filename"""
        with patch('main.cache_path', '/some/cache/dir'):
            result = main.get_timestamp_filepath()
            assert result.endswith(main.LAST_RUN_FILENAME)

    def test_returns_path_joined_with_cache_path(self):
        """Test that the path is joined with cache_path"""
        with patch('main.cache_path', '/some/cache/dir'):
            result = main.get_timestamp_filepath()
            assert result == os.path.join('/some/cache/dir', main.LAST_RUN_FILENAME)

    def test_uses_current_cache_path(self):
        """Test that changes to cache_path are reflected in the result"""
        with patch('main.cache_path', '/different/path'):
            result = main.get_timestamp_filepath()
            assert '/different/path' in result

class TestReadLastRunTimestamp:
    def test_returns_timestamp_when_file_exists(self):
        """Test that the timestamp value is returned when the file exists and is valid"""
        mock_data = json.dumps({"last_run": 1234567890.0})
        with patch('main.get_timestamp_filepath', return_value='/fake/path/ts.json'):
            with patch('builtins.open', mock_open(read_data=mock_data)):
                result = main.read_last_run_timestamp()
                assert result == 1234567890.0

    def test_returns_none_when_file_not_found(self):
        """Test that None is returned when the file does not exist"""
        with patch('main.get_timestamp_filepath', return_value='/fake/path/ts.json'):
            with patch('builtins.open', side_effect=FileNotFoundError):
                result = main.read_last_run_timestamp()
                assert result is None

    def test_returns_none_when_json_is_invalid(self):
        """Test that None is returned when the file contains invalid JSON"""
        with patch('main.get_timestamp_filepath', return_value='/fake/path/ts.json'):
            with patch('builtins.open', mock_open(read_data="not valid json {")):
                result = main.read_last_run_timestamp()
                assert result is None

    def test_returns_none_when_key_missing(self):
        """Test that None is returned when 'last_run' key is absent"""
        mock_data = json.dumps({"other_key": 999})
        with patch('main.get_timestamp_filepath', return_value='/fake/path/ts.json'):
            with patch('builtins.open', mock_open(read_data=mock_data)):
                result = main.read_last_run_timestamp()
                assert result is None

    def test_returns_none_when_file_is_empty(self):
        """Test that None is returned when the file is empty"""
        with patch('main.get_timestamp_filepath', return_value='/fake/path/ts.json'):
            with patch('builtins.open', mock_open(read_data="")):
                result = main.read_last_run_timestamp()
                assert result is None

class TestWriteLastRunTimestamp:
    def test_writes_last_run_key_to_file(self):
        """Test that a JSON file with 'last_run' is written"""
        mock_file = mock_open()
        fake_time = 9999999.0
        with patch('main.get_timestamp_filepath', return_value='/fake/path/ts.json'):
            with patch('builtins.open', mock_file):
                with patch('time.time', return_value=fake_time):
                    main.write_last_run_timestamp()

        handle = mock_file()
        written = "".join(c.args[0] for c in handle.write.call_args_list)
        parsed = json.loads(written)
        assert parsed["last_run"] == fake_time

    def test_opens_file_in_write_mode(self):
        """Test that the file is opened in write mode"""
        mock_file = mock_open()
        with patch('main.get_timestamp_filepath', return_value='/fake/path/ts.json'):
            with patch('builtins.open', mock_file):
                with patch('time.time', return_value=1.0):
                    main.write_last_run_timestamp()

        mock_file.assert_called_once_with('/fake/path/ts.json', 'w')

    def test_logs_after_writing(self):
        """Test that a log message is emitted after writing"""
        mock_file = mock_open()
        with patch('main.get_timestamp_filepath', return_value='/fake/path/ts.json'):
            with patch('builtins.open', mock_file):
                with patch('time.time', return_value=1.0):
                    with patch.object(main.logger, 'info') as mock_log:
                        main.write_last_run_timestamp()
                        assert mock_log.called
                        logged_msg = mock_log.call_args[0][0]
                        assert '/fake/path/ts.json' in logged_msg

class TestSecondsUntilNextRun:
    def test_returns_zero_when_no_timestamp(self):
        """Test that 0 is returned when there is no previous timestamp"""
        with patch('main.read_last_run_timestamp', return_value=None):
            result = main.seconds_until_next_run()
            assert result == 0

    def test_returns_zero_when_interval_has_passed(self):
        """Test that 0 is returned when the full interval has already elapsed"""
        old_timestamp = time.time() - main.DOWNLOAD_INTERVAL_SECONDS - 100
        with patch('main.read_last_run_timestamp', return_value=old_timestamp):
            result = main.seconds_until_next_run()
            assert result == 0

    def test_returns_remaining_seconds_when_recent(self):
        """Test that the correct remaining time is returned for a recent timestamp"""
        elapsed = 3600  # 1 hour ago
        recent_timestamp = time.time() - elapsed
        with patch('main.read_last_run_timestamp', return_value=recent_timestamp):
            result = main.seconds_until_next_run()
            expected = main.DOWNLOAD_INTERVAL_SECONDS - elapsed
            assert abs(result - expected) < 2

    def test_never_returns_negative(self):
        """Test that the result is never negative"""
        very_old_timestamp = time.time() - main.DOWNLOAD_INTERVAL_SECONDS * 10
        with patch('main.read_last_run_timestamp', return_value=very_old_timestamp):
            result = main.seconds_until_next_run()
            assert result >= 0

    def test_returns_full_interval_for_just_written_timestamp(self):
        """Test that nearly the full interval is returned for a brand-new timestamp"""
        now = time.time()
        with patch('main.read_last_run_timestamp', return_value=now):
            with patch('time.time', return_value=now):
                result = main.seconds_until_next_run()
                assert abs(result - main.DOWNLOAD_INTERVAL_SECONDS) < 1

class TestRunDownloadDatasets:
    def test_calls_download_datasets_on_instance(self):
        """Test that download_datasets is called on the concordia_api_instance"""
        mock_instance = MagicMock()
        with patch('main.concordia_api_instance', mock_instance):
            with patch('main.write_last_run_timestamp'):
                with patch('main.schedule_next_download'):
                    main.run_download_datasets()
                    mock_instance.download_datasets.assert_called_once()

    def test_writes_timestamp_on_success(self):
        """Test that the timestamp is written after a successful download"""
        mock_instance = MagicMock()
        with patch('main.concordia_api_instance', mock_instance):
            with patch('main.write_last_run_timestamp') as mock_write:
                with patch('main.schedule_next_download'):
                    main.run_download_datasets()
                    mock_write.assert_called_once()

    def test_schedules_next_download_on_success(self):
        """Test that the next download is scheduled after success"""
        mock_instance = MagicMock()
        with patch('main.concordia_api_instance', mock_instance):
            with patch('main.write_last_run_timestamp'):
                with patch('main.schedule_next_download') as mock_schedule:
                    main.run_download_datasets()
                    mock_schedule.assert_called_once_with(main.DOWNLOAD_INTERVAL_SECONDS)

    def test_schedules_next_download_even_on_failure(self):
        """Test that the next download is still scheduled even if download_datasets raises"""
        mock_instance = MagicMock()
        mock_instance.download_datasets.side_effect = Exception("Network error")
        with patch('main.concordia_api_instance', mock_instance):
            with patch('main.write_last_run_timestamp') as mock_write:
                with patch('main.schedule_next_download') as mock_schedule:
                    main.run_download_datasets()
                    mock_write.assert_not_called()
                    mock_schedule.assert_called_once_with(main.DOWNLOAD_INTERVAL_SECONDS)

    def test_logs_error_on_failure(self):
        """Test that an error is logged when download_datasets raises"""
        mock_instance = MagicMock()
        mock_instance.download_datasets.side_effect = Exception("Timeout")
        with patch('main.concordia_api_instance', mock_instance):
            with patch('main.write_last_run_timestamp'):
                with patch('main.schedule_next_download'):
                    with patch.object(main.logger, 'error') as mock_log:
                        main.run_download_datasets()
                        assert mock_log.called

class TestScheduleNextDownload:
    def test_creates_a_daemon_timer_thread(self):
        """Test that a daemon Timer is started with the given delay"""
        captured = {}

        def fake_timer(delay, fn):
            t = MagicMock()
            captured['delay'] = delay
            captured['fn'] = fn
            captured['timer'] = t
            return t

        with patch('threading.Timer', side_effect=fake_timer):
            main.schedule_next_download(300)

        assert captured['delay'] == 300
        assert captured['fn'] == main.run_download_datasets
        captured['timer'].start.assert_called_once()

    def test_timer_is_set_as_daemon(self):
        """Test that the timer thread is marked as daemon"""
        captured = {}

        def fake_timer(delay, fn):
            t = MagicMock()
            captured['timer'] = t
            return t

        with patch('threading.Timer', side_effect=fake_timer):
            main.schedule_next_download(60)

        assert captured['timer'].daemon is True

    def test_logs_next_scheduled_time(self):
        """Test that the next scheduled run time is logged"""
        with patch('threading.Timer') as mock_timer:
            mock_timer.return_value = MagicMock()
            with patch.object(main.logger, 'info') as mock_log:
                main.schedule_next_download(3600)
                assert mock_log.called
                logged_msg = mock_log.call_args[0][0]
                assert '3600' in logged_msg

class TestStartDownloadScheduler:
    def test_runs_immediately_when_no_previous_timestamp(self):
        """Test that a thread is started immediately when seconds_until_next_run returns 0"""
        captured = {}

        def fake_thread(target, daemon):
            t = MagicMock()
            captured['target'] = target
            captured['daemon'] = daemon
            captured['thread'] = t
            return t

        with patch('main.seconds_until_next_run', return_value=0):
            with patch('threading.Thread', side_effect=fake_thread):
                main.start_download_scheduler()

        assert captured['target'] == main.run_download_datasets
        assert captured['daemon'] is True
        captured['thread'].start.assert_called_once()

    def test_schedules_later_when_recent_download(self):
        """Test that schedule_next_download is called when there is remaining time"""
        with patch('main.seconds_until_next_run', return_value=7200):
            with patch('main.schedule_next_download') as mock_schedule:
                main.start_download_scheduler()
                mock_schedule.assert_called_once_with(7200)

    def test_does_not_schedule_when_running_immediately(self):
        """Test that schedule_next_download is not called when running immediately"""
        with patch('main.seconds_until_next_run', return_value=0):
            with patch('threading.Thread') as mock_thread:
                mock_thread.return_value = MagicMock()
                with patch('main.schedule_next_download') as mock_schedule:
                    main.start_download_scheduler()
                    mock_schedule.assert_not_called()

    def test_does_not_start_thread_when_scheduling_later(self):
        """Test that a new thread is not started when deferring to schedule_next_download"""
        with patch('main.seconds_until_next_run', return_value=3600):
            with patch('main.schedule_next_download'):
                with patch('threading.Thread') as mock_thread:
                    main.start_download_scheduler()
                    mock_thread.assert_not_called()

    def test_logs_immediate_run_message(self):
        """Test that an appropriate message is logged for an immediate run"""
        with patch('main.seconds_until_next_run', return_value=0):
            with patch('threading.Thread') as mock_thread:
                mock_thread.return_value = MagicMock()
                with patch.object(main.logger, 'info') as mock_log:
                    main.start_download_scheduler()
                    messages = [c[0][0] for c in mock_log.call_args_list]
                    assert any('download' in m.lower() or 'first run' in m.lower() for m in messages)

    def test_logs_deferred_run_message(self):
        """Test that an appropriate message is logged when deferring the run"""
        with patch('main.seconds_until_next_run', return_value=5000):
            with patch('main.schedule_next_download'):
                with patch.object(main.logger, 'info') as mock_log:
                    main.start_download_scheduler()
                    messages = [c[0][0] for c in mock_log.call_args_list]
                    assert any('5000' in m or 'recent' in m.lower() for m in messages)