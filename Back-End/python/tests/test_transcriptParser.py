#!/usr/bin/env python3
"""
Tests for transcriptParser.py
"""

import pytest
import json
import sys
import os
from unittest.mock import Mock, patch, mock_open, MagicMock
from pathlib import Path

# Add parent directory to path so we can import transcriptParser
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the module to test
import transcriptParser

class TestExtractTermFromText:
    """Test extract_term_from_text function"""
    
    def test_winter_term(self):
        result = transcriptParser.extract_term_from_text('Winter 2023')
        assert result == {'term': 'Winter', 'year': '2023'}
    
    def test_fall_term(self):
        result = transcriptParser.extract_term_from_text('Fall 2024')
        assert result == {'term': 'Fall', 'year': '2024'}
    
    def test_spring_term(self):
        result = transcriptParser.extract_term_from_text('Spring 2025')
        assert result == {'term': 'Spring', 'year': '2025'}
    
    def test_summer_term(self):
        result = transcriptParser.extract_term_from_text('Summer 2024')
        assert result == {'term': 'Summer', 'year': '2024'}
    
    def test_fall_winter_term(self):
        result = transcriptParser.extract_term_from_text('Fall/Winter 2025-26')
        assert result == {'term': 'Fall/Winter', 'year': '2025-26'}
    
    def test_invalid_term(self):
        result = transcriptParser.extract_term_from_text('Invalid term')
        assert result is None
    
    def test_empty_string(self):
        result = transcriptParser.extract_term_from_text('')
        assert result is None


class TestIsCourseCode:
    """Test is_course_code function"""
    
    def test_valid_course_code(self):
        assert transcriptParser.is_course_code('COMP') is True
        assert transcriptParser.is_course_code('SOEN') is True
        assert transcriptParser.is_course_code('ENGR') is True
        assert transcriptParser.is_course_code('MATH') is True
    
    def test_invalid_course_code(self):
        assert transcriptParser.is_course_code('COURSE') is False
        assert transcriptParser.is_course_code('GRADE') is False
        assert transcriptParser.is_course_code('GPA') is False
        assert transcriptParser.is_course_code('') is False
        assert transcriptParser.is_course_code('A') is False  # Too short
        assert transcriptParser.is_course_code('ABCDE') is False  # Too long
    
    def test_lowercase(self):
        assert transcriptParser.is_course_code('comp') is False  # Must be uppercase


class TestIsCourseNumber:
    """Test is_course_number function"""
    
    def test_valid_course_number(self):
        assert transcriptParser.is_course_number('101') is True
        assert transcriptParser.is_course_number('232') is True
        assert transcriptParser.is_course_number('249') is True
    
    def test_invalid_course_number(self):
        assert transcriptParser.is_course_number('12') is False  # Too short
        assert transcriptParser.is_course_number('1234') is False  # Too long
        assert transcriptParser.is_course_number('ABC') is False  # Not numeric
        assert transcriptParser.is_course_number('') is False


class TestIsSection:
    """Test is_section function"""
    
    def test_valid_section(self):
        assert transcriptParser.is_section('A') is True
        assert transcriptParser.is_section('EC') is True
        assert transcriptParser.is_section('QQ') is True
        assert transcriptParser.is_section('S') is True
        assert transcriptParser.is_section('1') is True
        assert transcriptParser.is_section('12') is True
    
    def test_invalid_section(self):
        assert transcriptParser.is_section('ABCD') is False  # Too long
        assert transcriptParser.is_section('') is False


class TestIsTransferCredit:
    """Test is_transfer_credit function"""
    
    def test_ex_grade(self):
        course = {'grade': 'EX'}
        assert transcriptParser.is_transfer_credit(course) is True
    
    def test_ex_lowercase(self):
        course = {'grade': 'ex'}
        assert transcriptParser.is_transfer_credit(course) is True
    
    def test_trc_grade(self):
        course = {'grade': 'TRC'}
        assert transcriptParser.is_transfer_credit(course) is True
    
    def test_trc_lowercase(self):
        course = {'grade': 'trc'}
        assert transcriptParser.is_transfer_credit(course) is True
    
    def test_non_ex_grade(self):
        course = {'grade': 'A'}
        assert transcriptParser.is_transfer_credit(course) is False
    
    def test_no_grade(self):
        course = {}
        assert transcriptParser.is_transfer_credit(course) is False
    
    def test_trc_and_ex_both_transfer_credits(self):
        """Test that both TRC and EX are considered transfer credits"""
        assert transcriptParser.is_transfer_credit({'grade': 'TRC'}) is True
        assert transcriptParser.is_transfer_credit({'grade': 'EX'}) is True
        assert transcriptParser.is_transfer_credit({'grade': 'A'}) is False


class TestMain:
    """Test main function"""
    
    def test_main_no_args(self, capsys):
        """Test main with no arguments"""
        with patch('sys.argv', ['transcriptParser.py']):
            with pytest.raises(SystemExit) as exc_info:
                transcriptParser.main()
            assert exc_info.value.code == 1
            captured = capsys.readouterr()
            assert 'Usage:' in captured.err
    
    def test_main_file_not_found(self, capsys):
        """Test main with non-existent file"""
        with patch('sys.argv', ['transcriptParser.py', '/nonexistent/file.pdf']):
            with patch('pathlib.Path.exists', return_value=False):
                with pytest.raises(SystemExit) as exc_info:
                    transcriptParser.main()
                assert exc_info.value.code == 1
                captured = capsys.readouterr()
                assert 'ERROR: File not found' in captured.err
    
    @patch('transcriptParser.parse_transcript')
    @patch('pathlib.Path.exists', return_value=True)
    def test_main_success(self, mock_exists, mock_parse, capsys):
        """Test main with successful parsing"""
        mock_result = {
            'programInfo': {'degree': 'Test Degree'},
            'semesters': [],
            'transferedCourses': [],
            'exemptedCourses': [],
            'deficiencyCourses': []
        }
        mock_parse.return_value = mock_result
        
        with patch('sys.argv', ['transcriptParser.py', '/path/to/file.pdf']):
            transcriptParser.main()
            captured = capsys.readouterr()
            # Should output JSON
            assert 'programInfo' in captured.out
            assert 'Test Degree' in captured.out
    
    @patch('transcriptParser.parse_transcript')
    @patch('pathlib.Path.exists', return_value=True)
    def test_main_exception(self, mock_exists, mock_parse, capsys):
        """Test main with exception during parsing"""
        mock_parse.side_effect = Exception('Test error')
        
        with patch('sys.argv', ['transcriptParser.py', '/path/to/file.pdf']):
            with pytest.raises(SystemExit) as exc_info:
                transcriptParser.main()
            assert exc_info.value.code == 1
            captured = capsys.readouterr()
            assert 'ERROR:' in captured.err
            assert 'Test error' in captured.err


class TestParseTranscript:
    """Test parse_transcript function with mocked PyMuPDF"""
    
    @patch('transcriptParser.fitz')
    def test_parse_transcript_empty_document(self, mock_fitz):
        """Test parsing with empty document"""
        # Create mock document
        mock_doc = MagicMock()
        mock_doc.__len__ = Mock(return_value=0)
        mock_fitz.open.return_value = mock_doc
        
        result = transcriptParser.parse_transcript('/path/to/file.pdf')
        
        assert isinstance(result, dict)
        # Empty document should return structure with deficiencyCourses at minimum
        assert 'deficiencyCourses' in result
        assert result['deficiencyCourses'] == []
        mock_doc.close.assert_called_once()
    
    @patch('transcriptParser.fitz')
    def test_parse_transcript_basic_structure(self, mock_fitz):
        """Test parsing returns correct structure"""
        mock_doc = MagicMock()
        mock_doc.__len__ = Mock(return_value=1)
        
        # Mock first page
        mock_page = MagicMock()
        # get_text() without args returns string
        # get_text("words") returns list of word tuples
        def get_text_side_effect(mode=None):
            if mode == "words":
                return []  # Empty words list
            return 'Student Record\nJohn Doe\nStudent ID: 12345'
        mock_page.get_text.side_effect = get_text_side_effect
        mock_doc.__getitem__.return_value = mock_page
        
        mock_fitz.open.return_value = mock_doc
        
        result = transcriptParser.parse_transcript('/path/to/file.pdf')
        
        assert isinstance(result, dict)
        assert 'deficiencyCourses' in result
        mock_doc.close.assert_called_once()
    
    @patch('transcriptParser.fitz')
    def test_parse_transcript_with_student_info(self, mock_fitz):
        """Test parsing"""
        mock_doc = MagicMock()
        mock_doc.__len__ = Mock(return_value=1)
        
        mock_page = MagicMock()
        def get_text_side_effect(mode=None):
            if mode == "words":
                return []  # Empty words list
            return (
                'Student Record\n'
                'John Doe\n'
                'Student ID: 12345678\n'
                '123 Main St\n'
                'Montreal, QC\n'
                'Birthdate: 01/01/2000\n'
                'Permanent Code: ABCD12345678\n'
                'Telephone: 514-123-4567\n'
            )
        mock_page.get_text.side_effect = get_text_side_effect
        mock_doc.__getitem__.return_value = mock_page
        
        mock_fitz.open.return_value = mock_doc
        
        result = transcriptParser.parse_transcript('/path/to/file.pdf')
        
        assert isinstance(result, dict)
        assert 'deficiencyCourses' in result
        mock_doc.close.assert_called_once()
    
    @patch('transcriptParser.fitz')
    def test_parse_transcript_with_terms(self, mock_fitz):
        """Test parsing with term headers"""
        mock_doc = MagicMock()
        mock_doc.__len__ = Mock(return_value=1)
        
        mock_page = MagicMock()
        # Mock words - term header
        mock_words = [
            (0, 100, 50, 120, 'Winter', 0, 0, 0),
            (60, 100, 100, 120, '2023', 0, 0, 1),
        ]
        def get_text_side_effect(mode=None):
            if mode == "words":
                return mock_words
            return 'Winter 2023'
        mock_page.get_text.side_effect = get_text_side_effect
        mock_doc.__getitem__.return_value = mock_page
        
        mock_fitz.open.return_value = mock_doc
        
        result = transcriptParser.parse_transcript('/path/to/file.pdf')
        
        assert isinstance(result, dict)
        assert 'deficiencyCourses' in result
        mock_doc.close.assert_called_once()
    
    @patch('transcriptParser.fitz')
    def test_parse_transcript_with_courses(self, mock_fitz):
        """Test parsing with courses"""
        mock_doc = MagicMock()
        mock_doc.__len__ = Mock(return_value=1)
        
        mock_page = MagicMock()
        # Mock words for course parsing
        mock_words = [
            (0, 100, 30, 120, 'COMP', 0, 0, 0),
            (35, 100, 60, 120, '101', 0, 0, 1),
            (65, 100, 75, 120, 'A', 0, 0, 2),
            (80, 100, 100, 120, '3.00', 0, 0, 3),
            (105, 100, 115, 120, 'A', 0, 0, 4),
        ]
        def get_text_side_effect(mode=None):
            if mode == "words":
                return mock_words
            return 'Winter 2023\nCOMP 101 A 3.00 A'
        mock_page.get_text.side_effect = get_text_side_effect
        mock_doc.__getitem__.return_value = mock_page
        
        mock_fitz.open.return_value = mock_doc
        
        result = transcriptParser.parse_transcript('/path/to/file.pdf')
        
        assert isinstance(result, dict)
        assert 'deficiencyCourses' in result
        mock_doc.close.assert_called_once()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

