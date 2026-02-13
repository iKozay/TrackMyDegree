from dataclasses import dataclass, field
from typing import Optional
from enum import Enum

class DegreeType(Enum):
    STANDALONE = "Standalone"
    COOP = "Co-op"
    ECP = "ECP"

@dataclass(frozen=True)
class AnchorLink():
    text: str
    url: str

@dataclass
class BaseModel:
    def __str__(self) -> str:
        return str(serialize(self))

@dataclass
class CourseRules(BaseModel):
    prereq: list[list[str]] = field(default_factory=list)
    coreq: list[list[str]] = field(default_factory=list)
    not_taken: list[str] = field(default_factory=list)

@dataclass
class Course(BaseModel):
    _id: str
    title: str
    credits: float
    description: str
    offered_in: list[str]
    prereqCoreqText: str
    rules: CourseRules
    notes: str
    components: list[str]

@dataclass
class CoursePool(BaseModel):
    _id: str
    name: str
    creditsRequired: float
    courses: list[str] # List of course IDs only

@dataclass
class Degree(BaseModel):
    _id: str
    name: str
    degreeType: DegreeType
    totalCredits: float
    coursePools: list[str] # List of CoursePool IDs only

@dataclass
class ProgramRequirements(BaseModel):
    degree: Degree
    coursePools: list[CoursePool]    

@dataclass
class DegreeScraperConfig(BaseModel):
    long_name: str
    short_name: str
    scraper_class: type
    marker: Optional[str] = None

    def __post_init__(self):
        if self.marker is None:
            self.marker = self.long_name

# Helper function to serialize dataclass objects to dictionaries (JSON serializable)
def serialize(obj):
    if isinstance(obj, list):
        return [serialize(item) for item in obj]
    if isinstance(obj, Enum):
        return obj.value
    if hasattr(obj, "__dict__"):
        d = vars(obj).copy()  # Use vars() instead of __dict__ to avoid method conflicts
        for k, v in d.items():
            d[k] = serialize(v)
        return d
    return obj