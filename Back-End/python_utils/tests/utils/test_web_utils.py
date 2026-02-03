import unittest
from unittest.mock import patch, MagicMock, mock_open, call
import sys
import os
import requests
import time

# Add the parent directory to the path to import the modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from utils.web_utils import WebUtils


class TestWebUtils(unittest.TestCase):

    def setUp(self):
        """Set up test fixtures before each test method."""
        self.web_utils = WebUtils()

    def test_init(self):
        """Test WebUtils initialization."""
        web_utils = WebUtils()
        
        # Check if session is created
        self.assertIsInstance(web_utils.session, requests.Session)
        
        # Check default headers
        expected_user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        self.assertEqual(web_utils.session.headers['User-Agent'], expected_user_agent)
        
        # Check retry settings
        self.assertEqual(web_utils.max_retries, 3)
        self.assertEqual(web_utils.retry_delay, 1.0)

    @patch('utils.web_utils.requests.Session.get')
    def test_get_success(self, mock_session_get):
        """Test successful GET request."""
        # Mock successful response
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_session_get.return_value = mock_response
        
        result = self.web_utils.get("http://example.com")
        
        self.assertEqual(result, mock_response)
        mock_session_get.assert_called_once_with("http://example.com")
        mock_response.raise_for_status.assert_called_once()

    @patch('utils.web_utils.time.sleep')
    @patch('utils.web_utils.random.uniform')
    @patch('utils.web_utils.Logger')
    @patch('utils.web_utils.requests.Session.get')
    def test_get_retry_and_success(self, mock_session_get, mock_logger, mock_random, mock_sleep):
        """Test GET request with retry that eventually succeeds."""
        # Mock random.uniform to return a fixed value
        mock_random.return_value = 0.5
        
        # Mock logger instance
        mock_logger_instance = MagicMock()
        mock_logger.return_value = mock_logger_instance
        
        # First call fails, second succeeds
        mock_response_fail = MagicMock()
        mock_response_fail.raise_for_status.side_effect = requests.RequestException("Connection failed")
        
        mock_response_success = MagicMock()
        mock_response_success.raise_for_status.return_value = None
        
        mock_session_get.side_effect = [
            mock_response_fail,
            mock_response_success
        ]
        
        result = self.web_utils.get("http://example.com")
        
        self.assertEqual(result, mock_response_success)
        self.assertEqual(mock_session_get.call_count, 2)
        
        # Check if sleep was called with expected delay
        expected_delay = 1.0 * (2 ** 0) + 0.5  # 1.5 seconds
        mock_sleep.assert_called_once_with(expected_delay)
        
        # Check if warning was logged
        mock_logger_instance.warning.assert_called_once()

    @patch('utils.web_utils.time.sleep')
    @patch('utils.web_utils.random.uniform')
    @patch('utils.web_utils.Logger')
    @patch('utils.web_utils.requests.Session.get')
    def test_get_all_retries_fail(self, mock_session_get, mock_logger, mock_random, mock_sleep):
        """Test GET request that fails after all retries."""
        # Mock random.uniform to return a fixed value
        mock_random.return_value = 0.5
        
        # Mock logger instance
        mock_logger_instance = MagicMock()
        mock_logger.return_value = mock_logger_instance
        
        # All calls fail
        exception = requests.RequestException("Connection failed")
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = exception
        mock_session_get.return_value = mock_response
        
        with self.assertRaises(requests.RequestException):
            self.web_utils.get("http://example.com")
        
        # Should attempt max_retries + 1 times (4 total)
        self.assertEqual(mock_session_get.call_count, 4)
        
        # Should sleep 3 times (between retries)
        self.assertEqual(mock_sleep.call_count, 3)
        
        # Check sleep delays: 1.5, 3.5, 7.5
        expected_calls = [
            call(1.0 * (2 ** 0) + 0.5),  # 1.5
            call(1.0 * (2 ** 1) + 0.5),  # 2.5
            call(1.0 * (2 ** 2) + 0.5),  # 4.5
        ]
        mock_sleep.assert_has_calls(expected_calls)

    @patch('utils.web_utils.WebUtils.get')
    def test_fetch_html(self, mock_get):
        """Test fetch_html method."""
        mock_response = MagicMock()
        mock_response.text = "<html><body>Test HTML</body></html>"
        mock_get.return_value = mock_response
        
        result = self.web_utils.fetch_html("http://example.com")
        
        self.assertEqual(result, "<html><body>Test HTML</body></html>")
        mock_get.assert_called_once_with("http://example.com")

    @patch('utils.web_utils.WebUtils.get')
    def test_get_json(self, mock_get):
        """Test get_json method."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"key": "value", "data": [1, 2, 3]}
        mock_get.return_value = mock_response
        
        result = self.web_utils.get_json("http://example.com/api")
        
        expected = {"key": "value", "data": [1, 2, 3]}
        self.assertEqual(result, expected)
        mock_get.assert_called_once_with("http://example.com/api")
        mock_response.json.assert_called_once()

    @patch('utils.web_utils.Logger')
    @patch('builtins.open', new_callable=mock_open)
    @patch('utils.web_utils.WebUtils.get')
    def test_download_file_success(self, mock_get, mock_file, mock_logger):
        """Test successful file download."""
        # Mock logger instance
        mock_logger_instance = MagicMock()
        mock_logger.return_value = mock_logger_instance
        
        # Mock response with iter_content
        mock_response = MagicMock()
        mock_response.iter_content.return_value = [b'chunk1', b'chunk2', b'chunk3']
        mock_get.return_value = mock_response
        
        result = self.web_utils.download_file("http://example.com/file.txt", "/path/to/file.txt")
        
        self.assertTrue(result)
        mock_get.assert_called_once_with("http://example.com/file.txt")
        
        # Check file operations
        mock_file.assert_called_once_with("/path/to/file.txt", 'wb')
        handle = mock_file()
        
        # Check that chunks were written
        expected_writes = [call(b'chunk1'), call(b'chunk2'), call(b'chunk3')]
        handle.write.assert_has_calls(expected_writes)
        
        # Check success log
        mock_logger_instance.info.assert_called_once_with(
            "Downloaded: http://example.com/file.txt -> /path/to/file.txt"
        )

    @patch('utils.web_utils.Logger')
    @patch('builtins.open', new_callable=mock_open)
    @patch('utils.web_utils.WebUtils.get')
    def test_download_file_with_empty_chunks(self, mock_get, mock_file, mock_logger):
        """Test file download with empty chunks (which should be skipped)."""
        # Mock logger instance
        mock_logger_instance = MagicMock()
        mock_logger.return_value = mock_logger_instance
        
        # Mock response with some empty chunks
        mock_response = MagicMock()
        mock_response.iter_content.return_value = [b'chunk1', b'', b'chunk2', None, b'chunk3']
        mock_get.return_value = mock_response
        
        result = self.web_utils.download_file("http://example.com/file.txt", "/path/to/file.txt")
        
        self.assertTrue(result)
        
        # Check that only non-empty chunks were written
        handle = mock_file()
        expected_writes = [call(b'chunk1'), call(b'chunk2'), call(b'chunk3')]
        handle.write.assert_has_calls(expected_writes)

    @patch('utils.web_utils.Logger')
    @patch('builtins.open', new_callable=mock_open)
    @patch('utils.web_utils.WebUtils.get')
    def test_download_file_request_failure(self, mock_get, mock_file, mock_logger):
        """Test file download when GET request fails."""
        # Mock logger instance
        mock_logger_instance = MagicMock()
        mock_logger.return_value = mock_logger_instance
        
        # Mock get to raise exception
        mock_get.side_effect = requests.RequestException("Network error")
        
        result = self.web_utils.download_file("http://example.com/file.txt", "/path/to/file.txt")
        
        self.assertFalse(result)
        mock_get.assert_called_once_with("http://example.com/file.txt")
        
        # File should not be opened
        mock_file.assert_not_called()
        
        # Check error log
        mock_logger_instance.error.assert_called_once()
        error_call_args = mock_logger_instance.error.call_args[0][0]
        self.assertIn("Download failed: http://example.com/file.txt -> /path/to/file.txt", error_call_args)
        self.assertIn("Network error", error_call_args)

    @patch('utils.web_utils.Logger')
    @patch('builtins.open', side_effect=IOError("Permission denied"))
    @patch('utils.web_utils.WebUtils.get')
    def test_download_file_write_failure(self, mock_get, mock_file, mock_logger):
        """Test file download when file write fails."""
        # Mock logger instance
        mock_logger_instance = MagicMock()
        mock_logger.return_value = mock_logger_instance
        
        # Mock successful response
        mock_response = MagicMock()
        mock_response.iter_content.return_value = [b'chunk1']
        mock_get.return_value = mock_response
        
        result = self.web_utils.download_file("http://example.com/file.txt", "/path/to/file.txt")
        
        self.assertFalse(result)
        
        # Check error log
        mock_logger_instance.error.assert_called_once()
        error_call_args = mock_logger_instance.error.call_args[0][0]
        self.assertIn("Download failed: http://example.com/file.txt -> /path/to/file.txt", error_call_args)
        self.assertIn("Permission denied", error_call_args)


if __name__ == '__main__':
    unittest.main()