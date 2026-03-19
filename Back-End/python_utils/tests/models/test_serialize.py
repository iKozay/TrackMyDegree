import unittest
import sys
import os

# Add the parent directory to the path to import the modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from models import (
    serialize, DegreeType, AnchorLink, ConstraintType, Constraint, MaxCoursesFromSetParams
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

        # Nested dataclass
        constraint = Constraint(
            type=ConstraintType.MAX_COURSES_FROM_SET,
            params=MaxCoursesFromSetParams(courseList=["COMP 367", "MAST 332"], maxCourses=1),
            message="Students can take at most 1 of the following courses: COMP 367, MAST 332."
        )

        assert serialize(constraint)["type"] == "max_courses_from_set"
        assert serialize(constraint)["params"] == {
            "courseList": ["COMP 367", "MAST 332"],
            "maxCourses": 1,
        }


        # List of objects
        assert serialize([link, link]) == [{"text": "Test", "url": "http://test.com"}] * 2
        
        # Empty collections
        assert serialize([]) == []


if __name__ == '__main__':
    unittest.main()