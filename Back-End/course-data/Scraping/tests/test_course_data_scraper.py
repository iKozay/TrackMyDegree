import json
import sys
import pytest
import requests
import runpy

# Test setup
@pytest.fixture
def fake_html():
    return """
    <html>
      <body>
        <div class="course">
          <h3 class="accordion-header xlarge">
            COMP 248 – Object-Oriented Programming I (3 credits)
          </h3>
          <div class="accordion-body">
            Prerequisite/Corequisite: None.
            Description: Introduction to object-oriented programming concepts.
            Component(s): Lecture; Lab.
            Notes: Must be completed before COMP 249.
          </div>
        </div>
      </body>
    </html>
    """


class DummyResponse:
    def __init__(self, text, status_code=200, encoding="utf-8"):
        self.content = text.encode(encoding)
        self.status_code = status_code
        self.encoding = encoding
        self.headers = {"content-type": "text/html; charset=utf-8"}

# Test
def test_scraper_creates_valid_json(monkeypatch, fake_html, tmp_path):
    fake_url = "http://fake-url.com/page"
    output_file = tmp_path / "output.json"

    # Mock requests.get to return fake HTML instead of making a real request
    def mock_get(url, headers=None):
        assert url == fake_url
        return DummyResponse(fake_html)

    monkeypatch.setattr(requests, "get", mock_get)

    # Prepare fake sys.argv for the scraper
    test_args = ["script_name.py", fake_url, str(output_file)]

    monkeypatch.setattr(sys, "argv", test_args)
    runpy.run_path("Scrapers/course_data_scraper.py")

    # Assertions
    assert output_file.exists(), "Scraper did not create output file."

    data = json.loads(output_file.read_text(encoding="utf-8"))
    assert isinstance(data, list)
    assert len(data) == 1

    course = data[0]
    assert course["title"].startswith("COMP 248")
    assert course["credits"] == 3
    assert "object-oriented" in course["description"].lower()
    assert "lecture" in course["components"].lower()
    assert "comp 249" in course["notes"].lower()
