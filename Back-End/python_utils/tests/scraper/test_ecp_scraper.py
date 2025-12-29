import types
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scraper import ecp_scraper


class FakeA:
    def __init__(self, text, href="#"):
        self.text = text
        self._href = href

    def get(self, key):
        return self._href if key == "href" else None


class FakeCourseDiv:
    def __init__(self, code):
        self.code = code

    def find(self, tag):
        return FakeA(self.code, f"/{self.code.lower()}")


class FakeTR:
    def __init__(self, courses, title="Natural Science"):
        self.courses = courses
        self.title = title

    def findAll(self, tag, **kwargs):
        if tag == "div":
            return self.courses
        return []

    def find(self, tag):
        return FakeA(self.title)


class FakeGroup:
    def __init__(self, trs=None, courses=None, title=None):
        self.trs = trs or []
        self.courses = courses or []
        self.title = title

    def findAll(self, tag, **kwargs):
        if tag == "tr":
            return self.trs
        if tag == "div":
            return self.courses

    def find(self, tag, **kwargs):
        return FakeA("Natural Science")


class FakeSoup:
    def __init__(self, groups):
        self.groups = groups

    def find(self, tag, **kwargs):
        if kwargs.get("class_") == "defined-group":
            if "title" in kwargs:
                for g in self.groups:
                    if g.title == kwargs["title"]:
                        return g
            return self.groups[0]

        if kwargs.get("class_") == "content-main parsys":
            return self

    def findAll(self, tag):
        return [
            FakeA("Computer Science", "/cs"),
            FakeA("Mechanical Engineering", "/mech"),
        ]

@pytest.fixture(autouse=True)
def mock_dependencies(monkeypatch):
    def fake_extract(code, url):
        if code == "ANY":
            return ["ANY101"], [{"code": "ANY101"}]
        return {"code": code}

    monkeypatch.setattr(
        ecp_scraper.course_data_scraper,
        "extract_course_data",
        fake_extract,
    )

    monkeypatch.setattr(
        ecp_scraper.engr_general_electives_scraper,
        "scrape_electives",
        lambda: (["GEN101"], [{"code": "GEN101"}]),
    )

    def fake_fetch_html(url):
        course = FakeCourseDiv("COMP101")

        trs = [
            FakeTR([]),
            FakeTR([course]),
            FakeTR([course], title="Natural Science"),
        ]

        core = FakeGroup(trs=trs)
        nat = FakeGroup(courses=[course], title="Natural Science")
        excl = FakeGroup(courses=[course], title="ECP Electives Exclusion List")

        return FakeSoup([core, nat, excl])

    monkeypatch.setattr(
        ecp_scraper.course_data_scraper,
        "fetch_html",
        fake_fetch_html,
    )

def test_add_courses():
    course = FakeCourseDiv("ENGR201")

    pool, courses = ecp_scraper.add_courses([course], "http://base/")

    assert pool == ["ENGR201"]
    assert courses == [{"code": "ENGR201"}]


def test_scrape_engr_ecp():
    degree, pools, courses = ecp_scraper.scrape_engr_ecp()

    assert degree["_id"] == "ENGR_ECP"
    assert len(pools) == 3
    assert len(courses) >= 2
    assert pools[0]["_id"] == "ECP_ENGR_Core"


def test_scrape_comp_ecp_exclusion_and_options():
    degree, pools, courses = ecp_scraper.scrape_comp_ecp()

    assert degree["_id"] == "COMP_ECP"
    assert len(pools) >= 5

    # General electives pool
    assert "GEN101" in pools[1]["courses"]

    # Option electives pools
    for pool in pools[-3:]:
        assert pool["creditsRequired"] == 15
        assert isinstance(pool["courses"], list)
