import pytest
import sys
import os

sys.path.insert(
    0,
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from scraper import ecp_scraper


# ---------- Fake HTML objects ----------

class FakeA:
    def __init__(self, text, href="#"):
        self.text = text
        self._href = href

    def get(self, key):
        return self._href if key == "href" else None


class FakeCourseDiv:
    def __init__(self, code):
        self.code = code

    def find(self, tag, **kwargs):
        return FakeA(self.code, f"/{self.code.lower()}")


class FakeTR:
    def __init__(self, courses, title="Natural Science"):
        self.courses = courses
        self.title = title

    def findAll(self, tag, **kwargs):
        if tag == "div":
            return self.courses
        return []

    def find(self, tag, **kwargs):
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
        return []

    def find(self, tag, **kwargs):
        return FakeA(self.title or "Natural Science")


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
        # departments list
        return [
            FakeA("Computer Science", "/cs"),
            FakeA("Software Engineering", "/soen"),
            FakeA("Mechanical Engineering", "/mech"),
        ]


# ---------- Fixtures ----------

@pytest.fixture(autouse=True)
def mock_dependencies(monkeypatch):
    """
    Fully mocks:
    - extract_course_data (single + ANY mode)
    - scrape_electives
    - fetch_html
    - concordia_api_utils.get_instance
    """

    def fake_extract(code, url):
        if code == "ANY":
            return [
                {"_id": "ANY 101"},
                {"_id": "ANY 102"},
            ]

        return {"code": code}

    monkeypatch.setattr(
        ecp_scraper.course_data_scraper,
        "extract_course_data",
        fake_extract,
    )

    # Mock concordia_api_utils
    class FakeConcordiaAPIUtils:
        def get_all_courses(self):
            return [
                {"_id": "COMP 101", "code": "COMP 101", "title": "Intro to Programming", "credits": 3.0, 
                 "description": "Basic programming", "offeredIn": ["Fall", "Winter"], "prereqCoreqText": "",
                 "rules": {"prereq": [], "coreq": [], "not_taken": []}},
                {"_id": "MATH 101", "code": "MATH 101", "title": "Calculus", "credits": 3.0,
                 "description": "Basic calculus", "offeredIn": ["Fall", "Winter"], "prereqCoreqText": "",
                 "rules": {"prereq": [], "coreq": [], "not_taken": []}},
                {"_id": "HIST 101", "code": "HIST 101", "title": "History Course", "credits": 3.0,
                 "description": "History course description", "offeredIn": ["Fall"], "prereqCoreqText": "",
                 "rules": {"prereq": [], "coreq": [], "not_taken": []}},
                {"_id": "PHIL 102", "code": "PHIL 102", "title": "Philosophy Course", "credits": 3.0,
                 "description": "Philosophy course description", "offeredIn": ["Winter"], "prereqCoreqText": "",
                 "rules": {"prereq": [], "coreq": [], "not_taken": []}}
            ]

    def fake_get_instance():
        return FakeConcordiaAPIUtils()

    monkeypatch.setattr(
        "scraper.concordia_api_utils.get_instance",
        fake_get_instance,
    )

    monkeypatch.setattr(
        ecp_scraper.engr_general_electives_scraper,
        "scrape_electives",
        lambda: (["GEN 101", "GEN 102"], [{"code": "GEN 101"}, {"code": "GEN 102"}]),
    )

    def fake_fetch_html(url):
        course = FakeCourseDiv("COMP 101")

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


# ---------- Tests ----------

def test_add_courses():
    course = FakeCourseDiv("ENG 201")

    pool, courses = ecp_scraper.add_courses([course], "http://base/")

    assert pool == ["ENG 201"]
    assert courses == [{"code": "ENG 201"}]


def test_scrape_engr_ecp_full_coverage():
    result = ecp_scraper.scrape_engr_ecp()

    degree = result["degree"]
    pools = result["course_pool"]
    courses = result["courses"]

    assert degree["_id"] == "ENGR_ECP"
    assert degree["totalCredits"] == 30
    assert len(pools) == 3

    # Core
    assert pools[0]["_id"] == "ECP_ENGR_Core"
    assert "COMP 101" in pools[0]["courses"]

    # Natural science
    assert pools[1]["creditsRequired"] == 6
    assert "COMP 101" in pools[1]["courses"]

    # General electives
    assert pools[2]["courses"] == ["GEN 101", "GEN 102"]

    # coursePools propagation
    assert degree["coursePools"] == [p["name"] for p in pools]

    # courses list contains extracted dicts
    assert {"code": "COMP 101"} in courses
    assert {"code": "GEN 101"} in courses


def test_scrape_comp_ecp_exclusions_and_options():
    result = ecp_scraper.scrape_comp_ecp()

    degree = result["degree"]
    pools = result["course_pool"]
    courses = result["courses"]

    assert degree["_id"] == "COMP_ECP"
    assert len(pools) >= 5

    # ----- Core -----
    assert pools[0]["_id"] == "ECP_COMP_Core"
    assert "COMP 101" in pools[0]["courses"]

    # ----- General electives (with exclusion applied) -----
    gen_pool = pools[1]
    assert "GEN 101" in gen_pool["courses"]
    # COMP 101 was in exclusion list, must be removed
    assert "COMP 101" not in gen_pool["courses"]

    # ----- Option electives -----
    option_pools = pools[-3:]

    for pool in option_pools:
        assert pool["creditsRequired"] == 15
        assert isinstance(pool["courses"], list)
        assert len(pool["courses"]) > 0

    
    joint_comp_art = option_pools[1]["courses"]
    joint_data = option_pools[2]["courses"]

    # Check that allowed courses are present
    assert "HIST 101" in joint_comp_art or "PHIL 102" in joint_comp_art
    assert "HIST 101" in joint_data or "PHIL 102" in joint_data

    
    assert degree["coursePools"] == [p["name"] for p in pools]

def test_exclude_courses_from_list():
    courses = [
        {"_id": "COMP 101", "code": "COMP 101"},
        {"_id": "MATH 101", "code": "MATH 101"},
        {"_id": "HIST 101", "code": "HIST 101"},
        {"_id": "PHIL 102", "code": "PHIL 102"},
    ]
    exclusion = ["MATH 101", "PHIL 102"]

    filtered = ecp_scraper.exclude_courses_from_list(courses, exclusion)
    print("Filtered courses:", filtered)
    assert "MATH 101" not in [course["code"] for course in filtered]
    assert "PHIL 102" not in [course["code"] for course in filtered]
    assert "COMP 101" in [course["code"] for course in filtered]
    assert "HIST 101" in [course["code"] for course in filtered]

def test_exclude_subjects_from_list():
    courses = [
        {"_id": "COMP 101", "code": "COMP 101"},
        {"_id": "MATH 101", "code": "MATH 101"},
        {"_id": "HIST 101", "code": "HIST 101"},
        {"_id": "PHIL 102", "code": "PHIL 102"},
    ]
    exclusion_subjects = ["MATH", "PHIL"]

    filtered = ecp_scraper.exclude_subjects_from_list(courses, exclusion_subjects)
    print("Filtered courses:", filtered)
    assert "MATH 101" not in [course["code"] for course in filtered]
    assert "PHIL 102" not in [course["code"] for course in filtered]
    assert "COMP 101" in [course["code"] for course in filtered]
    assert "HIST 101" in [course["code"] for course in filtered]