from typing import Literal, Optional, Union
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict

class DegreeType(Enum):
    STANDALONE = "Standalone"
    COOP = "Co-op"
    ECP = "ECP"

class AnchorLink(BaseModel):
    model_config = ConfigDict(frozen=True)
    text: str
    url: str

class CourseRules(BaseModel):
    prereq: list[list[str]] = Field(default_factory=list)
    coreq: list[list[str]] = Field(default_factory=list)
    not_taken: list[str] = Field(default_factory=list)

class MongoDBModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, use_enum_values=True)
    id: str = Field(alias='_id')
    
    @property
    def _id(self) -> str:
        return self.id
    
    @_id.setter
    def _id(self, value: str) -> None:
        self.id = value

class Course(MongoDBModel):
    title: str
    credits: float
    description: str
    offered_in: list[str]
    prereqCoreqText: str
    rules: CourseRules
    notes: str
    components: list[str]

class CoursePool(MongoDBModel):
    name: str
    creditsRequired: float
    courses: list[str] # List of course IDs only

class Degree(MongoDBModel):
    name: str
    degreeType: DegreeType
    totalCredits: float
    coursePools: list[str] # List of CoursePool IDs only

class ProgramRequirements(BaseModel):
    degree: Degree
    coursePools: list[CoursePool]    

class DegreeScraperConfig(BaseModel):
    long_name: str
    short_name: str
    scraper_class: type
    marker: Optional[str] = None

    def __init__(self, **data):
        super().__init__(**data)
        if self.marker is None:
            self.marker = self.long_name

# Helper function to serialize dataclass objects to dictionaries (JSON serializable)
def serialize(obj):
    if isinstance(obj, list):
        return [serialize(item) for item in obj]
    if isinstance(obj, Enum):
        return obj.value
    if isinstance(obj, BaseModel):
        # Use Pydantic's model_dump to handle aliases properly
        d = obj.model_dump(by_alias=True)
        for k, v in d.items():
            d[k] = serialize(v)
        return d
    if hasattr(obj, "__dict__"):
        d = vars(obj).copy()  # Use vars() instead of __dict__ to avoid method conflicts
        for k, v in d.items():
            d[k] = serialize(v)
        return d
    return obj