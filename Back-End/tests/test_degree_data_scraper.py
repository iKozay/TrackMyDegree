import json
import sys
import pytest
import runpy
import requests


# Test setup
@pytest.fixture
def fake_html():
    return """
    <html>
      <body>
        <div class="title program-title">
          <h3>BEng in Software Engineering (120 credits)</h3>
        </div>
        <div class="program-required-courses defined-group">
          <table>
            <tr>
              <td>30</td>
              <td><a href="courses1.html#1">Software Engineering Core</a></td>
            </tr>
          </table>
        </div>
        <div class="defined-group" title="Software Engineering Core">
          <div class="formatted-course">
            <span class="course-code-number"><a href="#">COMP 248</a></span>
          </div>
          <div class="formatted-course">
            <span class="course-code-number"><a href="#">COMP 249</a></span>
          </div>
        </div>
      </body>
    </html>
    """


class DummyResponse:
    def __init__(self, html, status_code=200, encoding="utf-8"):
        self.content = html.encode(encoding)
        self.status_code = status_code
        self.encoding = encoding
        self.headers = {"content-type": "text/html; charset=utf-8"}


#test
def test_degree_scraper_creates_json_files(monkeypatch, fake_html, tmp_path):
    
    fake_url = "http://example.com/fake-degree-page.html"

    
    def mock_get(url, headers=None):
        return DummyResponse(fake_html)

    monkeypatch.setattr(requests, "get", mock_get)

    # Create temporary output directory
    output_dir = tmp_path / "output"
    output_dir.mkdir()

    # Prepare fake sys.argv for the script
    test_args = ["script_name.py", fake_url, str(output_dir)]
    monkeypatch.setattr(sys, "argv", test_args)

    # Run the scraper script dynamically
    runpy.run_path("course-data/Scraping/Scrapers/degree_data_scraper.py")

    
    # Assertions
    course_pool_file = output_dir / "course_pool.json"
    degree_file = output_dir / "degree.json"

    # Check both files exist
    assert course_pool_file.exists(), "Missing course_pool.json"
    assert degree_file.exists(), "Missing degree.json"

    # Load and verify content
    course_pool_data = json.loads(course_pool_file.read_text(encoding="utf-8"))
    degree_data = json.loads(degree_file.read_text(encoding="utf-8"))

    # Validate course pool JSON structure
    assert isinstance(course_pool_data, list)
    assert len(course_pool_data) == 1
    assert course_pool_data[0]["name"] == "Software Engineering Core"
    assert course_pool_data[0]["creditsRequired"] == 30
    assert "COMP 248" in course_pool_data[0]["courses"]
    assert "COMP 249" in course_pool_data[0]["courses"]

    # Validate degree JSON structure
    assert degree_data["name"] == "BEng in Software Engineering"
    assert degree_data["totalCredits"] == 120
    assert "Software Engineering Core" in degree_data["coursePools"]
