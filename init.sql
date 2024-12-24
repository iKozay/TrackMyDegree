CREATE TABLE Degree (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  totalCredits INT NOT NULL
);

CREATE TABLE Course (
  code VARCHAR(5) NOT NULL,
  number INT NOT NULL,
  credits INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  PRIMARY KEY (code, number)
);

CREATE TABLE Requisite (
    id VARCHAR(255) PRIMARY KEY,
    code1 VARCHAR(5),
    number1 INT,
    code2 VARCHAR(5),
    number2 INT,
    type VARCHAR(3) CHECK (type IN ('pre', 'co')),
    FOREIGN KEY (code1, number1) REFERENCES Course(code, number),
    FOREIGN KEY (code2, number2) REFERENCES Course(code, number)
);

CREATE TABLE CoursePool (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE DegreeXCoursePool (
  id VARCHAR(255) PRIMARY KEY,
  degree VARCHAR(255),
  coursepool VARCHAR(255),
  creditsRequired INT NOT NULL,
  required BIT NOT NULL,  -- Changed from BOOLEAN to BIT
  UNIQUE(degree, coursepool),
  FOREIGN KEY (degree) REFERENCES Degree(id),
  FOREIGN KEY (coursepool) REFERENCES CoursePool(id)
);

CREATE TABLE CourseXCoursePool (
  id VARCHAR(255) PRIMARY KEY,
  coursenumber INT,
  coursecode VARCHAR(5),
  coursepool VARCHAR(255),
  UNIQUE(coursenumber, coursecode, coursepool),
  FOREIGN KEY (coursecode, coursenumber) REFERENCES Course(code, number), -- Composite foreign key
  FOREIGN KEY (coursepool) REFERENCES CoursePool(id)
);

CREATE TABLE AppUser (  -- Use square brackets for reserved keywords
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    firstname VARCHAR(255) NOT NULL,-- add degree / add first and last name
    lastname VARCHAR(255) NOT NULL,
    degree VARCHAR(255) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('student', 'advisor', 'admin')) NOT NULL
);

CREATE TABLE Timeline (
    id VARCHAR(255) PRIMARY KEY,
    season VARCHAR(10) CHECK (season IN ('fall', 'winter', 'summer1', 'summer2', 'fall/winter', 'summer')) NOT NULL,
    year INT NOT NULL,
    coursenumber INT,
    coursecode VARCHAR(5),
    user_id VARCHAR(255),
    UNIQUE(user_id, coursecode, coursenumber, season, year),
    FOREIGN KEY (coursecode, coursenumber) REFERENCES Course(code, number), -- Composite foreign key
    FOREIGN KEY (user_id) REFERENCES AppUser (id)  -- Adjusted foreign key reference
);

CREATE TABLE Deficiency (
    id VARCHAR(255) PRIMARY KEY,
    coursepool VARCHAR(255),
    user_id VARCHAR(255),
    creditsRequired INT NOT NULL,
    UNIQUE(user_id, coursepool),
    FOREIGN KEY (coursepool) REFERENCES CoursePool(id),
    FOREIGN KEY (user_id) REFERENCES AppUser (id)
);

CREATE TABLE Exemption (
    id VARCHAR(255) PRIMARY KEY,
    coursenumber INT,
    coursecode VARCHAR(5),
    user_id VARCHAR(255),
    UNIQUE(user_id, coursecode, coursenumber),
    FOREIGN KEY (coursecode, coursenumber) REFERENCES Course(code, number), -- Composite foreign key
    FOREIGN KEY (user_id) REFERENCES AppUser (id)
);


-- Insert sample values into tables

-- Corrected INSERT statements

-- Degree table
INSERT INTO Degree (id, name, totalCredits)
VALUES ('1', 'Bachelor of Science in Computer Science', 120),
       ('2', 'Bachelor of Arts in Business Administration', 120);

-- Course table
INSERT INTO Course (code, number, credits, description)
VALUES ('C1', 1, 3, 'Introduction to Programming'),
       ('C2', 2, 3, 'Database Systems'),
       ('C3', 3, 3, 'Web Development');

-- Requisite table
INSERT INTO Requisite (id, code1, number1, code2, number2, type)
VALUES ('1', 'C2', 2, 'C1', 1, 'pre'),  -- Database Systems requires Introduction to Programming
       ('2', 'C3', 3, 'C2', 2, 'co');  -- Web Development requires Database Systems

-- CoursePool table
INSERT INTO CoursePool (id, name)
VALUES ('1', 'Core Courses'),
       ('2', 'Electives'),
       ('3', 'Special Topics');

-- DegreeXCoursePool table
INSERT INTO DegreeXCoursePool (id, degree, coursepool, creditsRequired, required)
VALUES ('1', '1', '1', 30, 1),  -- DegreeID 1 linked to CoursePoolID 1
       ('2', '1', '2', 15, 0),  -- DegreeID 1 linked to CoursePoolID 2
       ('3', '2', '3', 12, 1);  -- DegreeID 2 linked to CoursePoolID 3

-- CourseXCoursePool table
INSERT INTO CourseXCoursePool (id, coursenumber, coursecode, coursepool)
VALUES ('1', 1, 'C1', '1'),  -- CourseID 1 linked to CoursePoolID 1
       ('2', 2, 'C2', '2'),  -- CourseID 2 linked to CoursePoolID 2
       ('3', 3, 'C3', '3');  -- CourseID 3 linked to CoursePoolID 3

-- User table (changed from AppUser to [User])
INSERT INTO AppUser (id, email, password, name, type)
VALUES ('1', 'jd1@concordia.ca', '1234', 'John Doe', 'student'),
       ('2', 'jd2@concordia.ca', '5678', 'Jane Doe', 'advisor');

-- Timeline table
INSERT INTO Timeline (id, season, year, coursenumber, coursecode, user_id)
VALUES ('1', 'winter', 2024, NULL, NULL, '1'),  -- UserID 1's timeline for winter 2024
       ('2', 'fall', 2025, NULL, NULL, '2');  -- UserID 2's timeline for fall 2025

-- Deficiency table
INSERT INTO Deficiency (id, coursepool, user_id, creditsRequired)
VALUES ('1', '1', '1', 3),  -- UserID 1 has a deficiency
       ('2', '2', '2', 3);  -- UserID 2 has a deficiency

-- Exemption table
INSERT INTO Exemption (id, coursenumber, coursecode, user_id)
VALUES ('1', 1, 'C1', '1');  -- UserID 1 has an exemption

