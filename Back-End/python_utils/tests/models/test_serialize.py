import unittest
import sys
import os

# Add the parent directory to the path to import the modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from models import (
    serialize, Course, CourseRules, DegreeType, AnchorLink
)


class TestSerialize(unittest.TestCase):
    
    def test_serialize(self):
        """Test serialize function with all data types"""
        # Primitives
        assert serialize("test") == "test"
        assert serialize(123) == 123
        assert serialize(True) is True
        assert serialize(None) is None
        
        # Enum
        assert serialize(DegreeType.COOP) == "Co-op"
        
        # Simple dataclass
        link = AnchorLink(text="Test", url="http://test.com")
        assert serialize(link) == {"text": "Test", "url": "http://test.com"}
        
        # Complex dataclass with nested objects
        rules = CourseRules(prereq=[["MATH 205"]], coreq=[], not_taken=["COMP 200"])
        course = Course(_id="COMP 248", title="Programming", credits=3.5, 
                       description="Test", offered_in=["Fall"], prereqCoreqText="",
                       rules=rules, notes="", components=[])
        
        result = serialize(course)
        assert result["_id"] == "COMP 248"
        assert result["rules"]["prereq"] == [["MATH 205"]]
        assert result["rules"]["not_taken"] == ["COMP 200"]
        
        # List of objects
        assert serialize([link, link]) == [{"text": "Test", "url": "http://test.com"}] * 2
        
        # Empty collections
        assert serialize([]) == []
        assert serialize(CourseRules())["prereq"] == []


if __name__ == '__main__':
    unittest.main()