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
        CSV_SOURCES["course_catalog"]["cache"] = "mock_data"
        
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

    @patch('scraper.concordia_api_utils.CSV_SOURCES')
    def test_get_from_csv_subject_catalog_match(self, mock_csv_sources):
        # Test get_from_csv with subject and catalog
        mock_df = pd.DataFrame({
            "Subject": ["COMP", "MATH", "COMP"],
            "Catalog": ["248", "205", "348"],
            "Course Title": ["Java", "Calculus", "Python"]
        })
        
        mock_csv_sources.__getitem__.return_value = {
            "cache": mock_df,
            "subject_col": "Subject",
            "catalog_col": "Catalog"
        }
        
        result = self.api.get_from_csv("course_catalog", subject="COMP", catalog="248")
        
        assert len(result) == 1
        assert result[0]["Subject"] == "COMP"
        assert result[0]["Catalog"] == "248"
        
    @patch('scraper.concordia_api_utils.CSV_SOURCES')
    def test_get_from_csv_course_id_match(self, mock_csv_sources):
        # Test get_from_csv with course_id
        mock_df = pd.DataFrame({
            "Course ID": ["COMP248", "MATH205", "COMP348"],
            "Course Title": ["Java", "Calculus", "Python"]
        })
        
        mock_csv_sources.__getitem__.return_value = {
            "cache": mock_df,
            "subject_col": "Subject",
            "catalog_col": "Catalog"
        }
        
        result = self.api.get_from_csv("course_catalog", course_id="COMP248")
        
        assert len(result) == 1
        assert result[0]["Course ID"] == "COMP248"
        
    def test_parse_description_and_rules_with_description(self):
        # Test parsing text with Description section
        text = """Description: This course covers programming fundamentals.
        
        Prerequisite: MATH 205. Co-requisite: COMP 249.
        
        NOTE: Students who have received credit for COMP 200 may not take this course for credit."""
        
        with patch('scraper.concordia_api_utils.make_prereq_coreq_into_array') as mock_prereq, \
             patch('scraper.concordia_api_utils.get_not_taken') as mock_not_taken:
            
            # Mock for prerequisite section
            def prereq_side_effect(text):
                if "MATH 205" in text:
                    return [["MATH 205"]]
                elif "COMP 249" in text:
                    return [["COMP 249"]]
                else:
                    return []
            
            mock_prereq.side_effect = prereq_side_effect
            mock_not_taken.return_value = ["COMP 200"]
            
            result = self.api.parse_description_and_rules(text)
            
            assert "programming fundamentals" in result["description"]
            assert result["prereq"] == [["MATH 205"]]
            assert result["coreq"] == [["COMP 249"]] 
            assert result["not_taken"] == ["COMP 200"]
            
    def test_parse_description_and_rules_without_description(self):
        # Test parsing text without explicit Description section
        text = """This course covers advanced programming concepts.
        
        Prerequisites: COMP 248, COMP 249.
        
        NOTE: May not take COMP 300 for credit."""
        
        with patch('scraper.concordia_api_utils.make_prereq_coreq_into_array') as mock_prereq, \
             patch('scraper.concordia_api_utils.get_not_taken') as mock_not_taken:
            
            mock_prereq.return_value = [["COMP 248"], ["COMP 249"]]
            mock_not_taken.return_value = ["COMP 300"]
            
            result = self.api.parse_description_and_rules(text)
            
            assert "advanced programming" in result["description"]
            assert result["prereq"] == [["COMP 248"], ["COMP 249"]]
            assert result["not_taken"] == ["COMP 300"]

    @patch.object(ConcordiaAPIUtils, 'get_from_csv')
    @patch.object(ConcordiaAPIUtils, 'get_course_description')
    @patch.object(ConcordiaAPIUtils, 'get_term')
    @patch.object(ConcordiaAPIUtils, 'parse_description_and_rules')
    def test_get_course_from_catalog(self, mock_parse, mock_get_term, mock_get_desc, mock_get_csv):
        # Test complete course data extraction
        mock_get_csv.return_value = [{
            "Course ID": "COMP248",
            "Long Title": "Object-Oriented Programming I",
            "Class Units": "3"
        }]
        mock_get_desc.return_value = "Programming course description"
        mock_get_term.return_value = ["Fall", "Winter"]
        mock_parse.return_value = {
            "description": "Programming course description",
            "prereqCoreqText": "Math 205.",
            "prereq": [["MATH 205"]],
            "coreq": [],
            "not_taken": []
        }
        
        result = self.api.get_course_from_catalog("COMP 248")
        
        assert result["code"] == "COMP 248"
        assert result["title"] == "Object-Oriented Programming I"
        assert abs(result["credits"] - 3.0) < 1e-9
        assert result["offeredIn"] == ["Fall", "Winter"]
        assert result["description"] == "Programming course description"
        assert result["prereqCoreqText"] == "Math 205."
        assert result["rules"]["prereq"] == [["MATH 205"]]

    @patch.object(ConcordiaAPIUtils, 'get_from_csv')
    def test_get_course_description(self, mock_get_csv):
        # Test getting course description
        mock_get_csv.return_value = [{"Descr": "Sample course description"}]
        
        result = self.api.get_course_description("COMP248")
        assert result == "Sample course description"
        
    @patch.object(ConcordiaAPIUtils, 'get_from_csv')
    def test_get_course_description_not_found(self, mock_get_csv):
        # Test when course description not found
        mock_get_csv.return_value = []
        
        result = self.api.get_course_description("NONEXISTENT")
        assert result == ""
    
    @patch('utils.parsing_utils.make_prereq_coreq_into_array')
    @patch('utils.parsing_utils.get_not_taken')
    def test_parse_course_descritpion_with_none(self, mock_get_not_taken, mock_make_prereq_coreq):
        # Test parsing description when input is None
        result = self.api.parse_description_and_rules(None)
        assert result["description"] == ""
        assert result["prereqCoreqText"] == ""
        assert result["prereq"] == []
        assert result["coreq"] == []
        assert result["not_taken"] == []

    @patch('scraper.concordia_api_utils.CSV_SOURCES')
    @patch.object(ConcordiaAPIUtils, 'update_cache')
    @patch.object(ConcordiaAPIUtils, 'get_term')
    @patch.object(ConcordiaAPIUtils, 'parse_description_and_rules')
    def test_get_all_courses(self, mock_parse, mock_get_term, mock_update_cache, mock_csv_sources):
        # Test getting all courses
        
        # Mock catalog dataframe
        catalog_data = pd.DataFrame({
            "Subject": ["COMP", "MATH", "ENGR"],
            "Catalog": ["248", "205", "201"],
            "Course ID": ["COMP248", "MATH205", "ENGR201"],
            "Long Title": ["Object-Oriented Programming I", "Differential Calculus", "Professional Practice"],
            "Class Units": ["3.0", "3.0", "1.0"],
            "Career": ["UGRD", "UGRD", "UGRD"],
            "Component Code": ["LEC", "LEC", "LEC"]
        })
        
        # Mock description dataframe
        description_data = pd.DataFrame({
            "Course ID": ["COMP248", "MATH205", "ENGR201"],
            "Descr": ["Programming course description", "Calculus description", "Professional practice description"]
        })
        
        # Setup CSV_SOURCES mock
        def get_csv_source(key):
            if key == "course_catalog":
                return {"cache": catalog_data}
            elif key == "course_description":
                return {"cache": description_data}
            return {"cache": None}
            
        mock_csv_sources.__getitem__.side_effect = get_csv_source
        
        # Mock other dependencies
        mock_get_term.side_effect = lambda code: ["Fall", "Winter"] if "COMP" in code else ["Fall"]
        mock_parse.return_value = {
            "description": "Parsed description",
            "prereqCoreqText": "No prerequisites",
            "prereq": [],
            "coreq": [],
            "not_taken": []
        }
        
        # Call the method
        result = self.api.get_all_courses()
        
        # Verify results
        assert len(result) == 3
        
        # Check first course (COMP 248)
        comp_course = next(course for course in result if course["code"] == "COMP 248")
        assert comp_course["_id"] == "COMP 248"
        assert comp_course["title"] == "Object-Oriented Programming I"
        assert abs(comp_course["credits"] - 3.0) < 1e-9
        assert comp_course["description"] == "Parsed description"
        assert comp_course["offeredIn"] == ["Fall", "Winter"]
        assert comp_course["prereqCoreqText"] == "No prerequisites"
        assert "prereq" in comp_course["rules"]
        assert "coreq" in comp_course["rules"]
        assert "not_taken" in comp_course["rules"]
        
        # Verify methods were called
        assert mock_get_term.call_count == 3
        assert mock_parse.call_count == 3

def test_get_instance_singleton():
    # Test singleton pattern
    instance1 = get_instance()
    instance2 = get_instance()
    
    assert instance1 is instance2
    assert isinstance(instance1, ConcordiaAPIUtils)