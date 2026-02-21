from unittest.mock import patch
import pandas as pd
from utils.concordia_api_utils import ConcordiaAPIUtils
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

class TestConcordiaAPIUtils:
    
    def setup_method(self):
        self.api = ConcordiaAPIUtils(cache_dir="test_cache")
        
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
            
    def test_get_term_basic(self):
        # Mock CSV data for testing get_term
        mock_df = pd.DataFrame({
            "Subject": ["COMP", "COMP", "COMP"],
            "Catalog Nbr": ["248", "248", "248"], 
            "Term Code": ["202430", "202420", "202410"]
        })
        
        with patch.object(self.api, '_get_from_csv', return_value=mock_df.to_dict('records')):
            result = self.api.get_term("COMP 248")
            assert len(result) > 0
            
    def test_get_term_fallback_to_schedule(self):
        # Test fallback to course_schedule when course_section is empty
        mock_schedule_data = [{"Term Code": "202430"}]
        
        with patch.object(self.api, '_get_from_csv') as mock_csv:
            mock_csv.side_effect = lambda csv_name, **kwargs: [] if csv_name == "course_section" else mock_schedule_data
            
            result = self.api.get_term("COMP 248")
            assert len(result) > 0

    def test__get_from_csv_returns_matching_records(self):
        self.api.data_cache["course_schedule"] = pd.DataFrame({
            "Subject": ["COMP", "SOEN"], 
            "Catalog Nbr": ["248", "228"],
            "Term Code": ["202430", "202410"]
        })
        result = self.api._get_from_csv("course_schedule", subject="COMP", catalog="248")
        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0]["Subject"] == "COMP"
        assert result[0]["Catalog Nbr"] == "248"

    def test__get_from_csv_empty_when_no_match(self):
        self.api.data_cache["course_schedule"] = pd.DataFrame({"Subject": ["SOEN"], "Catalog Nbr": ["228"], "Term Code": ["202420"]})
        result = self.api._get_from_csv("course_schedule", subject="COMP", catalog="999")
        assert result == []

    def test__get_from_csv_no_match_returns_empty(self):
        self.api.data_cache["course_schedule"] = pd.DataFrame({
            "Subject": ["COMP"], 
            "Catalog Nbr": ["248"],
            "Term Code": ["202410"]
        })
        result = self.api._get_from_csv("course_schedule", subject="SOEN", catalog="111")
        assert result == []

    @patch("utils.concordia_api_utils.download_file")
    @patch("utils.concordia_api_utils.pd.read_csv")
    @patch("os.makedirs")
    @patch("os.path.exists")
    @patch("os.path.join")
    def test_download_datasets_in_dev_mode_uses_local_cache(
        self, mock_join, mock_exists, mock_makedirs, mock_read_csv, mock_download_file
    ):
        # Setup
        self.api.dev_mode = True
        mock_exists.return_value = True
        mock_read_csv.return_value = pd.DataFrame({"Subject": ["COMP"], "Catalog Nbr": ["248"], "Term Code": ["202430"]})
        mock_join.side_effect = lambda *args: os.path.sep.join(args)

        self.api.download_datasets()
        assert "course_schedule" in self.api.data_cache
        assert "course_section" in self.api.data_cache
        mock_download_file.assert_not_called()

    @patch("utils.concordia_api_utils.download_file")
    @patch("utils.concordia_api_utils.pd.read_csv")
    @patch("tempfile.gettempdir")
    @patch("os.path.join")
    @patch("os.path.exists")
    @patch("os.makedirs")
    def test_download_datasets_in_prod_mode_downloads(
        self, mock_makedirs, mock_exists, mock_join, mock_gettempdir, mock_read_csv, mock_download_file
    ):
        self.api.dev_mode = False
        mock_gettempdir.return_value = "/tempdir"
        mock_join.side_effect = lambda *args: os.path.sep.join(args)
        mock_exists.return_value = False

        mock_read_csv.return_value = pd.DataFrame({"Subject": ["COMP"], "Catalog Nbr": ["248"], "Term Code": ["202430"]})
        mock_download_file.return_value = None

        self.api.download_datasets()
        assert "course_schedule" in self.api.data_cache
        assert "course_section" in self.api.data_cache
        assert mock_download_file.call_count == 2
    
    def test_get_course_schedule(self):
        # Mock CSV data for testing get_course_schedule
        mock_df = pd.DataFrame([
            # In-person
            {"Course ID": "123", "Room Code": "H937", "Instruction Mode code": "INP", "Mon": "Y", "Subject": "COMP", "Catalog Nbr": "248", "Term Code": "202430"},
            # Online
            {"Course ID": "10009", "Room Code": "ONLINE", "Instruction Mode code": "OL", "Mon": "N", "Subject": "ENGR", "Catalog Nbr": "391", "Term Code": "2244"},
            # Missing fields
            {"Course ID": "", "Room Code": "", "Instruction Mode code": "", "Mon": "", "Subject": "SOEN", "Catalog Nbr": "999", "Term Code": ""}
        ])
        
        with patch.object(self.api, '_get_from_csv', return_value=mock_df.to_dict('records')):
            result = self.api.get_course_schedule("COMP", "248")
            assert isinstance(result, list)
            assert len(result) == 3
            # In-person
            assert result[0]["courseID"] == "000123"
            assert result[0]["roomCode"] == "H937"
            assert result[0]["modays"] == "Y"
            assert result[0]["subject"] == "COMP"
            assert result[0]["catalog"] == "248"
            assert result[0]["termCode"] == "202430"
            # Online
            assert result[1]["courseID"] == "010009"
            assert result[1]["roomCode"] == "ONLINE"
            assert result[1]["modays"] == "N"
            assert result[1]["subject"] == "ENGR"
            assert result[1]["catalog"] == "391"
            assert result[1]["termCode"] == "2244"
            # Missing fields
            assert result[2]["courseID"] == "000000"
            assert result[2]["roomCode"] == ""
            assert result[2]["modays"] == ""
            assert result[2]["subject"] == "SOEN"
            assert result[2]["catalog"] == "999"
            assert result[2]["termCode"] == ""
            # Empty response
            with patch.object(self.api, '_get_from_csv', return_value=[]):
                empty_result = self.api.get_course_schedule("SOEN", "000")
                assert empty_result == []