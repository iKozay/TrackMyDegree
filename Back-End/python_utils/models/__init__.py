from dataclasses import dataclass, field

@dataclass
class BaseModel:
    def __str__(self):
        return str(serialize(self))

@dataclass
class AnchorLink(BaseModel):
    text: str
    url: str

@dataclass
class CourseRules(BaseModel):
    prereq: list[list[str]] = field(default_factory=list)
    coreq: list[list[str]] = field(default_factory=list)
    not_taken: list[str] = field(default_factory=list)

@dataclass
class Course(BaseModel):
    _id: str
    title: str
    credits: int
    description: str
    offered_in: list[str]
    prereq_coreq_text: str
    rules: CourseRules
    notes: str
    components: list[str]

@dataclass
class CoursePool(BaseModel):
    _id: str
    name: str
    credits_required: int
    courses: list[str] # List of course IDs only

@dataclass
class Degree(BaseModel):
    _id: str
    name: str
    credits_required: int
    course_pools: list[str] # List of CoursePool IDs only

@dataclass
class DegreeRequirements(BaseModel):
    degree: Degree
    course_pools: list[CoursePool]

@dataclass
class ScraperAPIResponse(DegreeRequirements):
    courses: list[Course]

@dataclass
class DegreeScraperConfig(BaseModel):
    long_name: str
    short_name: str
    scraper_class: type

# Helper function to serialize dataclass objects to dictionaries (JSON serializable)
def serialize(obj):
    if isinstance(obj, list):
        return [serialize(item) for item in obj]
    if hasattr(obj, "__dict__"):
        d = obj.__dict__.copy()
        for k, v in d.items():
            d[k] = serialize(v)
        return d
    return obj