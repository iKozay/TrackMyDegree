from unittest.mock import patch, Mock
from scraper.concordia_api_utils import get_term
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


@patch("scraper.concordia_api_utils.requests.get")
def test_get_term_coverage(mock_get):
    mock_response = Mock()
    mock_response.json.return_value = [
        {"term": "202430"},
        {"term": "202420"},
    ]
    mock_get.return_value = mock_response

    result = get_term("COMP 248")

    assert result