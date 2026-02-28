import sys
import os
import logging

# Add the parent directory to the path to import the modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from utils.logging_utils import get_logger

def test_get_logger():
    logger = get_logger("test_logger")
    assert isinstance(logger, logging.Logger)
    assert logger.name == "test_logger"
    assert logger.level == logging.INFO
    assert any(isinstance(h, logging.StreamHandler) for h in logger.handlers)
    handler = logger.handlers[0]
    assert isinstance(handler.formatter, logging.Formatter)
    expected_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    assert handler.formatter._fmt == expected_format