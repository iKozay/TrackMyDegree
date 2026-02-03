from dataclasses import dataclass, field
from typing import List

@dataclass
class BS4Output:
    text: str
    url: str

@dataclass
class CourseRules:
    prereq: List[List[str]] = field(default_factory=list)
    coreq: List[List[str]] = field(default_factory=list)
    not_taken: List[str] = field(default_factory=list)

@dataclass
class Course:
    _id: str
    title: str
    credits: int
    description: str
    offered_in: List[str]
    prereq_coreq_text: str
    rules: CourseRules