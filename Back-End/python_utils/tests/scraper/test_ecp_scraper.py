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
    """

    def fake_extract(code, url):
        if code == "ANY":
            return [
                {"_id": "ANY101"},
                {"_id": "ANY102"},
            ]

        return {"code": code}

    monkeypatch.setattr(
        ecp_scraper.course_data_scraper,
        "extract_course_data",
        fake_extract,
    )

    monkeypatch.setattr(
        ecp_scraper.engr_general_electives_scraper,
        "scrape_electives",
        lambda: (["GEN101", "GEN102"], [{"code": "GEN101"}, {"code": "GEN102"}]),
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


# ---------- Tests ----------

def test_add_courses():
    course = FakeCourseDiv("ENGR201")

    pool, courses = ecp_scraper.add_courses([course], "http://base/")

    assert pool == ["ENGR201"]
    assert courses == [{"code": "ENGR201"}]


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
    assert "COMP101" in pools[0]["courses"]

    # Natural science
    assert pools[1]["creditsRequired"] == 6
    assert "COMP101" in pools[1]["courses"]

    # General electives
    assert pools[2]["courses"] == ["GEN101", "GEN102"]

    # coursePools propagation
    assert degree["coursePools"] == [p["name"] for p in pools]

    # courses list contains extracted dicts
    assert {"code": "COMP101"} in courses
    assert {"code": "GEN101"} in courses


def test_scrape_comp_ecp_exclusions_and_options():
    result = ecp_scraper.scrape_comp_ecp()

    degree = result["degree"]
    pools = result["course_pool"]
    courses = result["courses"]

    assert degree["_id"] == "COMP_ECP"
    assert len(pools) >= 5

    # ----- Core -----
    assert pools[0]["_id"] == "ECP_COMP_Core"
    assert "COMP101" in pools[0]["courses"]

    # ----- General electives (with exclusion applied) -----
    gen_pool = pools[1]
    assert "GEN101" in gen_pool["courses"]
    # COMP101 was in exclusion list, must be removed
    assert "COMP101" not in gen_pool["courses"]

    # ----- Option electives -----
    option_pools = pools[-3:]

    for pool in option_pools:
        assert pool["creditsRequired"] == 15
        assert isinstance(pool["courses"], list)
        assert "COMP101" in pool["courses"]

    
    joint_comp_art = option_pools[1]["courses"]
    joint_data = option_pools[2]["courses"]

    assert "ANY101" in joint_comp_art
    assert "ANY102" in joint_data

    
    assert degree["coursePools"] == [p["name"] for p in pools]
