import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from scraper import comp_utils


class FakeA:
    def __init__(self, text):
        self.text = text


class FakeDiv:
    def __init__(self, texts):
        self.texts = texts

    def find_all(self, tag):
        return [FakeA(t) for t in self.texts]


class FakeSoup:
    def __init__(self, texts):
        self.texts = texts

    def find(self, tag, **kwargs):
        return FakeDiv(self.texts)


@pytest.fixture(autouse=True)
def mock_dependencies(monkeypatch):
    # extract_course_data returns LIST OF DICTS here
    monkeypatch.setattr(
        comp_utils.course_data_scraper,
        "extract_course_data",
        lambda code, url: [
            {"code": "COMP248"},  # < 325 → removed
            {"code": "COMP352"},  # >= 325 → kept
        ],
    )

    # general electives
    monkeypatch.setattr(
        comp_utils.engr_general_electives_scraper,
        "scrape_electives",
        lambda: (
            ["GEN101", "GEN102"],
            [
                {"code": "GEN101"},  # excluded
                {"code": "GEN102"},  # kept
            ],
        ),
    )

    # exclusion list HTML
    monkeypatch.setattr(
        comp_utils.course_data_scraper,
        "fetch_html",
        lambda url: FakeSoup(["GEN101"]),
    )


def test_get_comp_electives_filters_by_code_number():
    codes, courses = comp_utils.get_comp_electives()

    assert codes == ["COMP352"]
    assert courses == [{"code": "COMP352"}]


def test_get_comp_gen_electives_exclusions_applied():
    output_codes, courses = comp_utils.get_comp_gen_electives(
        "http://fake-url",
        ["COMP352"],
    )

    # GEN101 excluded, GEN102 kept
    assert output_codes == ["COMP352", "GEN102"]
    assert courses == [{"code": "GEN102"}]
