--Active: 1731210639535@@localhost@1433@master


CREATE TABLE Degree (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  totalCredits FLOAT NOT NULL,
  isAddon BIT NOT NULL DEFAULT 0
);

CREATE TABLE Course (
  code VARCHAR(7) NOT NULL,
  title VARCHAR(255),
  credits FLOAT NOT NULL,
  description VARCHAR(2055) NOT NULL,
  PRIMARY KEY (code)
);

CREATE TABLE Requisite (
    id VARCHAR(255) PRIMARY KEY,
    code1 VARCHAR(7) NOT NULL,          -- Course that has the requisite
    code2 VARCHAR(7),                    -- Prerequisite course (NULL if credit-based)
    type VARCHAR(3) CHECK (type IN ('pre', 'co')), -- 'pre' for prerequisite, 'co' for corequisite
    group_id VARCHAR(255),               -- Identifier for groups of alternative requisites
    creditsRequired FLOAT,                 -- Number of credits required (NULL if course-based)
    FOREIGN KEY (code1) REFERENCES Course(code),
    FOREIGN KEY (code2) REFERENCES Course(code),
    CONSTRAINT UC_Requisite UNIQUE (code1, code2, type, group_id, creditsRequired),
    CONSTRAINT CK_Requisite_CreditsOrCourse
        CHECK (
            (creditsRequired IS NOT NULL AND code2 IS NULL) OR
            (creditsRequired IS NULL AND code2 IS NOT NULL)
        )
);

CREATE TABLE CoursePool (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE DegreeXCoursePool (
  id VARCHAR(255) PRIMARY KEY,
  degree VARCHAR(255),
  coursepool VARCHAR(255),
  creditsRequired FLOAT NOT NULL,
  UNIQUE(degree, coursepool),
  FOREIGN KEY (degree) REFERENCES Degree(id),
  FOREIGN KEY (coursepool) REFERENCES CoursePool(id) ON DELETE CASCADE
);

CREATE TABLE CourseXCoursePool (
  id VARCHAR(255) PRIMARY KEY,
  coursecode VARCHAR(7),
  coursepool VARCHAR(255),
  groupId VARCHAR(255),
  UNIQUE(coursecode, coursepool),
  CONSTRAINT UC_CourseXCoursePool UNIQUE (coursecode, coursepool, groupId),
  FOREIGN KEY (coursecode) REFERENCES Course(code), -- Composite foreign key
  FOREIGN KEY (coursepool) REFERENCES CoursePool(id) ON DELETE CASCADE
);

CREATE TABLE AppUser (  -- Use square brackets for reserved keywords
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fullname VARCHAR(255) NOT NULL,
    degree VARCHAR(255),
    type VARCHAR(10) CHECK (type IN ('student', 'advisor', 'admin')) NOT NULL,
    FOREIGN KEY (degree) REFERENCES Degree(id)
);

CREATE TABLE Timeline (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    degree_id VARCHAR(255) NOT NULL,  -- New column for the associated degree
    name VARCHAR(100) NOT NULL,
    isExtendedCredit BIT NOT NULL DEFAULT 0,
    last_modified DATETIME2,
    FOREIGN KEY (user_id) REFERENCES AppUser (id) ON DELETE CASCADE,
    FOREIGN KEY (degree_id) REFERENCES Degree(id)
);


CREATE TABLE TimelineItems (
    id VARCHAR(255) PRIMARY KEY,
    timeline_id VARCHAR(255) NOT NULL,    -- Belongs to a specific timeline
    season VARCHAR(11) CHECK (season IN ('fall', 'winter', 'summer1', 'summer2', 'fall/winter', 'summer', 'exempted')) NOT NULL,
    year INT NOT NULL, 
    UNIQUE(timeline_id, season, year),
    FOREIGN KEY (timeline_id) REFERENCES Timeline(id) ON DELETE CASCADE
);

CREATE TABLE TimelineItemXCourses (
    timeline_item_id VARCHAR(255) NOT NULL,
    coursecode VARCHAR(7) NOT NULL,
    PRIMARY KEY (timeline_item_id, coursecode),
    FOREIGN KEY (timeline_item_id) REFERENCES TimelineItems(id) ON DELETE CASCADE,
    FOREIGN KEY (coursecode) REFERENCES Course(code)
);

CREATE TABLE Deficiency (
    id VARCHAR(255) PRIMARY KEY,
    coursepool VARCHAR(255),
    user_id VARCHAR(255),
    creditsRequired FLOAT NOT NULL,
    UNIQUE(user_id, coursepool),
    FOREIGN KEY (coursepool) REFERENCES CoursePool(id),
    FOREIGN KEY (user_id) REFERENCES AppUser (id)
);

CREATE TABLE Exemption (
    id VARCHAR(255) PRIMARY KEY,
    coursecode VARCHAR(7),
    user_id VARCHAR(255),
    UNIQUE(user_id, coursecode),
    FOREIGN KEY (coursecode) REFERENCES Course(code), -- Composite foreign key
    FOREIGN KEY (user_id) REFERENCES AppUser (id)
);

CREATE TABLE Feedback (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NULL,  -- Nullable since the user may not be logged in
    message TEXT NOT NULL,
    submitted_at DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES AppUser(id) ON DELETE SET NULL
);

-- ================================================
-- Index Creation for Performance Improvement
-- ================================================

-- Index on DegreeXCoursePool for filtering by degree
CREATE NONCLUSTERED INDEX idx_DegreeXCoursePool_degree
ON DegreeXCoursePool (degree);

-- Index on CourseXCoursePool for joining on coursepool
CREATE NONCLUSTERED INDEX idx_CourseXCoursePool_coursepool
ON CourseXCoursePool (coursepool);

-- Index on Requisite for joining on code1
CREATE NONCLUSTERED INDEX idx_Requisite_code1
ON Requisite (code1);

CREATE NONCLUSTERED INDEX idx_Requisite_code2
ON Requisite (code2);

-- Index on CoursePool for sorting by name
CREATE NONCLUSTERED INDEX idx_CoursePool_name
ON CoursePool (name);

-- Insert sample values into tables

-- Corrected INSERT statements

-- Degree table
-- INSERT INTO Degree (id, name, totalCredits)
-- VALUES ('1', 'Bachelor of Science in Computer Science', 120),
--        ('2', 'Bachelor of Arts in Business Administration', 120);

-- -- Course table
INSERT INTO Course (code, credits, description)
VALUES ('COMP335', 3, 'Introduction to Programming'),
       ('SOEN363', 3, 'Database Systems'),
        ('SOEN287', 3, 'Web Development');

-- -- Requisite table
-- INSERT INTO Requisite (id, code1, code2, type)
-- VALUES ('1', 'COMP335', 'SOEN363', 'pre'),  -- Database Systems requires Introduction to Programming
--        ('2', 'SOEN363', 'SOEN287', 'co');  -- Web Development requires Database Systems

-- -- CoursePool table
-- INSERT INTO CoursePool (id, name)
-- VALUES ('1', 'Core Courses'),
--        ('2', 'Electives'),
--        ('3', 'Special Topics');

-- -- DegreeXCoursePool table
-- INSERT INTO DegreeXCoursePool (id, degree, coursepool, creditsRequired)
-- VALUES ('1', '1', '1', 30),  -- DegreeID 1 linked to CoursePoolID 1
--        ('2', '1', '2', 15),  -- DegreeID 1 linked to CoursePoolID 2
--        ('3', '2', '3', 12);  -- DegreeID 2 linked to CoursePoolID 3

-- -- CourseXCoursePool table
-- INSERT INTO CourseXCoursePool (id, coursecode, coursepool)
-- VALUES ('1', 'COMP335', '1'),  -- CourseID 1 linked to CoursePoolID 1
--        ('2', 'SOEN363', '2'),  -- CourseID 2 linked to CoursePoolID 2
--        ('3', 'SOEN287', '3');  -- CourseID 3 linked to CoursePoolID 3

-- -- User table (changed from AppUser to [User])

-- INSERT INTO AppUser (id, email, password, fullname, degree, type)
-- VALUES ('1', 'jd1@concordia.ca', '1234', 'John Doe', '1', 'student'),
--        ('2', 'jd2@concordia.ca', '5678', 'Jane Doe', NULL, 'advisor');

-- -- Timeline table
-- INSERT INTO Timeline (id, season, year, coursecode, user_id)
-- VALUES ('1', 'winter', 2024, 'COMP335', '1'),  -- UserID 1's timeline for winter 2024
--        ('2', 'fall', 2025, 'COMP335', '2');  -- UserID 2's timeline for fall 2025

-- -- Deficiency table
-- INSERT INTO Deficiency (id, coursepool, user_id, creditsRequired)
-- VALUES ('1', '2', '1', 3),  -- UserID 1 has a deficiency
--        ('2', '2', '2', 3);  -- UserID 2 has a deficiency

-- -- Exemption table
-- INSERT INTO Exemption (id, coursecode, user_id)
-- VALUES ('1', 'COMP335', '1');  -- UserID 1 has an exemption

