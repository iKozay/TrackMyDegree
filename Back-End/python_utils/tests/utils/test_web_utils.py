import unittest
from unittest.mock import patch, MagicMock, mock_open, call
import sys
import os
import requests

# Add the parent directory to the path to import the modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Import the module and its functions
import utils.web_utils as web_utils
from utils.web_utils import get, fetch_html, get_json, download_file



def test_module_configuration():
    assert isinstance(web_utils.session, requests.Session)
    expected_user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    assert web_utils.session.headers['User-Agent'] == expected_user_agent
    assert web_utils.max_retries == 3
    assert web_utils.retry_delay == 1.0

@patch('utils.web_utils.session')
def test_get_success(mock_session):
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_session.get.return_value = mock_response
    result = get("http://example.com")
    assert result == mock_response
    mock_session.get.assert_called_once_with("http://example.com", timeout=60)
    mock_response.raise_for_status.assert_called_once()

@patch('utils.web_utils.time.sleep')
@patch('utils.web_utils.random.uniform')
@patch('utils.web_utils.session')
def test_get_retry_success(mock_session, mock_random, mock_sleep):
    mock_random.return_value = 0.5
    mock_response_fail = MagicMock()
    mock_response_fail.raise_for_status.side_effect = requests.RequestException("Connection failed")
    mock_response_success = MagicMock()
    mock_response_success.raise_for_status.return_value = None
    mock_session.get.side_effect = [mock_response_fail, mock_response_success]
    result = get("http://example.com")
    assert result == mock_response_success
    assert mock_session.get.call_count == 2
    mock_sleep.assert_called_once()

@patch('utils.web_utils.time.sleep')
@patch('utils.web_utils.random.uniform')
@patch('utils.web_utils.session')
def test_get_all_retries_exhausted(mock_session, mock_random, mock_sleep):
    mock_random.return_value = 0.5
    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = requests.RequestException("Connection failed")
    mock_session.get.return_value = mock_response
    import pytest
    with pytest.raises(requests.RequestException):
        get("http://example.com")
    assert mock_session.get.call_count == 4
    assert mock_sleep.call_count == 3

@patch('utils.web_utils.get')
def test_fetch_html(mock_get):
    mock_response = MagicMock()
    mock_response.text = "<html><body>Test Content</body></html>"
    mock_get.return_value = mock_response
    result = fetch_html("http://example.com")
    assert result == "<html><body>Test Content</body></html>"
    mock_get.assert_called_once_with("http://example.com")

@patch('utils.web_utils.get')
def test_get_json(mock_get):
    mock_response = MagicMock()
    test_data = {"message": "success", "data": [1, 2, 3]}
    mock_response.json.return_value = test_data
    mock_get.return_value = mock_response
    result = get_json("http://api.example.com/data")
    assert result == test_data
    mock_get.assert_called_once_with("http://api.example.com/data")
    mock_response.json.assert_called_once()

@patch('builtins.open', new_callable=mock_open)
@patch('utils.web_utils.get')
def test_download_file_success(mock_get, mock_file):
    mock_response = MagicMock()
    mock_response.iter_content.return_value = [b'chunk1', b'chunk2']
    mock_get.return_value = mock_response
    result = download_file("http://example.com/file.pdf", "/tmp/file.pdf")
    assert result is True
    mock_get.assert_called_once_with("http://example.com/file.pdf")
    mock_file.assert_called_once_with("/tmp/file.pdf", 'wb')
    handle = mock_file()
    handle.write.assert_has_calls([call(b'chunk1'), call(b'chunk2')])

@patch('builtins.open', new_callable=mock_open)
@patch('utils.web_utils.get')
def test_download_file_with_empty_chunks(mock_get, mock_file):
    mock_response = MagicMock()
    mock_response.iter_content.return_value = [b'data1', b'', b'data2', None]
    mock_get.return_value = mock_response
    result = download_file("http://example.com/file.txt", "/tmp/file.txt")
    assert result is True
    handle = mock_file()
    handle.write.assert_has_calls([call(b'data1'), call(b'data2')])

@patch('utils.web_utils.get')
def test_download_file_get_fails(mock_get):
    mock_get.side_effect = requests.RequestException("Network error")
    result = download_file("http://example.com/file.txt", "/tmp/file.txt")
    assert result is False

@patch('builtins.open', side_effect=IOError("Permission denied"))
@patch('utils.web_utils.get')
def test_download_file_write_fails(mock_get, mock_file):
    mock_response = MagicMock()
    mock_response.iter_content.return_value = [b'data']
    mock_get.return_value = mock_response
    result = download_file("http://example.com/file.txt", "/readonly/file.txt")
    assert result is False

@patch('utils.web_utils.session')
def test_get_raises_for_status_exception(mock_session):
    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = requests.HTTPError("404 Not Found")
    mock_session.get.return_value = mock_response
    import pytest
    with pytest.raises(requests.HTTPError):
        get("http://example.com/notfound")

@patch('utils.web_utils.time.sleep')
@patch('utils.web_utils.random.uniform')
@patch('utils.web_utils.session')
def test_get_exponential_backoff(mock_session, mock_random, mock_sleep):
    mock_random.return_value = 0.5
    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = requests.RequestException("Error")
    mock_session.get.return_value = mock_response
    import pytest
    with pytest.raises(requests.RequestException):
        get("http://example.com")
    expected_calls = [
        call(1.0 * (2 ** 0) + 0.5),  # 1.5
        call(1.0 * (2 ** 1) + 0.5),  # 2.5
        call(1.0 * (2 ** 2) + 0.5),  # 4.5
    ]
    mock_sleep.assert_has_calls(expected_calls)

@patch('utils.web_utils.session')
def test_get_max_retries(mock_session):
    original_max_retries = web_utils.max_retries
    try:
        web_utils.max_retries = 2
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = requests.RequestException("Always fails")
        mock_session.get.return_value = mock_response
        import pytest
        with pytest.raises(requests.RequestException):
            get("http://example.com")
        assert mock_session.get.call_count == 3
    finally:
        web_utils.max_retries = original_max_retries