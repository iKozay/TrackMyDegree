from typing import Optional, Union
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

class ConstraintType(str, Enum):
    # General constraints
    MIN_CREDITS_FROM_SET = "min_credits_from_set"               # Minimum credits must be taken from a set of courses
    MAX_CREDITS_FROM_SET = "max_credits_from_set"               # Maximum credits can be taken from a set of courses
    MIN_COURSES_FROM_SET = "min_courses_from_set"               # Minimum courses must be taken from a set of courses
    MAX_COURSES_FROM_SET = "max_courses_from_set"               # Maximum courses can be taken from a set of courses

    # Course-specific constraints
    # Prerequisite/corequisite constraints can be represented as a MIN_COURSES_FROM_SET constraint
    # Not taken constraints can be represented as a MAX_COURSES_FROM_SET constraint with max_courses=0
    PREREQUISITE = "prerequisite"                               # Course A must be taken before B
    COREQUISITE = "corequisite"                                 # Course A must be taken in the same term as B
    PREREQUISITE_OR_COREQUISITE = "prerequisite_or_corequisite" # Course A must be taken before or in the same term as B
    NOT_TAKEN = "not_taken"                                     # Course A cannot be taken if B is taken 
    MIN_CREDITS = "min_credits"                                 # Minimum credits completed required to take the course

    # Course pool specific constraints
    EXCESS_CREDITS_OVERFLOW = "excess_credits_overflow"         # Excess credits beyond required amount flow to target pool


    # Intermediate constraints for handling special cases (used for internal logic)
    COURSE_ADDITION = "course_addition"                                 # Course A is added to pool if degree name matches
    COURSE_REMOVAL = "course_removal"                                   # Course A is removed from pool if degree name matches
    COURSE_SUBSTITUTION = "course_substitution"                         # Course A is substituted with Course B if degree name matches

    OVERRIDE_COURSEPOOL_COURSES = "override_coursepool_courses"         # Override the list of courses in a course pool based on degree name

class MinCreditsFromSetParams(BaseModel):
    courseList: list[str]
    minCredits: float

class MaxCreditsFromSetParams(BaseModel):
    courseList: list[str]
    maxCredits: float

class MinCoursesFromSetParams(BaseModel):
    courseList: list[str]
    minCourses: int

class MaxCoursesFromSetParams(BaseModel):
    courseList: list[str]
    maxCourses: int

class MinCreditsCompletedParams(BaseModel):
    minCredits: float

class ExcessCreditsOverflowParams(BaseModel):
    targetPoolId: str  # ID of the pool where excess credits should flow to
    # When this pool's credit requirement is exceeded, excess credits count toward targetPoolId

class CourseAdditionParams(BaseModel):
    courseId: str
    degreeId: Optional[str] = None  # If specified, addition only applies to this degree

class CourseRemovalParams(BaseModel):
    courseId: str
    degreeId: Optional[str] = None  # If specified, removal only applies to this degree

class CourseSubstitutionParams(BaseModel):
    oldCourseId: str
    newCourseId: str
    degreeId: Optional[str] = None  # If specified, substitution only applies to this degree

class OverrideCoursePoolCoursesParams(BaseModel):
    coursePoolId: str
    newCourseList: list[str]
    degreeId: Optional[str] = None  # If specified, override only applies to this degree

ConstraintParams = Union[
    MinCreditsFromSetParams,
    MaxCreditsFromSetParams,
    MinCoursesFromSetParams,
    MaxCoursesFromSetParams,
    MinCreditsCompletedParams,
    ExcessCreditsOverflowParams,
    CourseAdditionParams,
    CourseRemovalParams,
    CourseSubstitutionParams,
    OverrideCoursePoolCoursesParams
]

class Constraint(BaseModel):
    type: ConstraintType
    params: ConstraintParams
    message: str = ""
    level: str = "warning"  # Can be "warning" or "info"
    # warning: Constraint is not strictly required but recommended for a well-structured program
    # info: informational constraint that provides additional details but does not impact requirement satisfaction

class CourseRules(BaseModel):
    #TODO: swap CourseRules with list of constraints to have the same system for both courses and course pools
    prereq: list[list[str]] = Field(default_factory=list)
    coreq: list[list[str]] = Field(default_factory=list)
    not_taken: list[str] = Field(default_factory=list)
    min_credits: float = 0.0

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
    rules: list[Constraint] = Field(default_factory=list)

class Degree(MongoDBModel):
    name: str
    degreeType: DegreeType
    totalCredits: float
    coursePools: list[str] # List of CoursePool IDs only
    ecpDegreeId: Optional[str] = None

class ProgramRequirements(BaseModel):
    degree: Degree
    coursePools: list[CoursePool]    

# ECP degree ID constants
class ECPDegreeIDs:
    ENGR_ECP_ID = "Extended Credit Program - Engineering"
    COMP_ECP_ID = "Extended Credit Program - BCompSc"
    COMP_CA_ECP_ID = "Extended Credit Program - Computation Arts and Computer Science"
    COMP_DS_ECP_ID = "Extended Credit Program - Data Science"
    COMP_HLS_ECP_ID = "Extended Credit Program - Health and Life Sciences"

class DegreeScraperConfig(BaseModel):
    long_name: str
    short_name: str
    scraper_class: type
    ecp_degree_id: Optional[str] = None
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