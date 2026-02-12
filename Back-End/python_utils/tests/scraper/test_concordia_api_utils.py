from unittest.mock import patch, Mock, MagicMock
import pandas as pd
from scraper.concordia_api_utils import ConcordiaAPIUtils, get_instance
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

class TestConcordiaAPIUtils:
    
    def setup_method(self):
        self.api = ConcordiaAPIUtils()
        
    def test_sanitize_data_dict(self):
        # Test sanitizing dictionary data
        test_data = {
            "key1": "value1",
            "key2": None,
            "key3": float('nan'),
            "key4": 123,
            "key5": 45.67
        }
        result = self.api._sanitize_data(test_data)
        
        expected = {
            "key1": "value1",
            "key2": "",
            "key3": "",
            "key4": "123",
            "key5": "45.67"
        }
        assert result == expected
        
    def test_sanitize_data_list(self):
        # Test sanitizing list of dictionaries
        test_data = [
            {"key1": "value1", "key2": None},
            {"key1": 123, "key2": "value2"}
        ]
        result = self.api._sanitize_data(test_data)
        
        expected = [
            {"key1": "value1", "key2": ""},
            {"key1": "123", "key2": "value2"}
        ]
        assert result == expected
        
    def test_clear_cache(self):
        # Test cache clearing functionality
        from scraper.concordia_api_utils import CSV_SOURCES
        # Set some mock cache data
        CSV_SOURCES["course_schedule"]["cache"] = "mock_data"
        
        self.api.clear_cache()
        
        for csv_name in CSV_SOURCES:
            assert CSV_SOURCES[csv_name]["cache"] is None
            
    def test_get_term_basic(self):
        # Mock CSV data for testing get_term
        mock_df = pd.DataFrame({
            "Subject": ["COMP", "COMP", "COMP"],
            "Catalog Nbr": ["248", "248", "248"], 
            "Term Code": ["202430", "202420", "202410"]
        })
        
        with patch.object(self.api, 'get_from_csv', return_value=mock_df.to_dict('records')):
            result = self.api.get_term("COMP 248")
            assert len(result) > 0
            
    def test_get_term_fallback_to_schedule(self):
        # Test fallback to course_schedule when course_section is empty
        mock_schedule_data = [{"Term Code": "202430"}]
        
        with patch.object(self.api, 'get_from_csv') as mock_csv:
            mock_csv.side_effect = lambda csv_name, **kwargs: [] if csv_name == "course_section" else mock_schedule_data
            
            result = self.api.get_term("COMP 248")
            assert len(result) > 0

def test_get_instance_singleton():
    # Test singleton pattern
    instance1 = get_instance()
    instance2 = get_instance()
    
    assert instance1 is instance2
    assert isinstance(instance1, ConcordiaAPIUtils)