
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
    type ENUM('pre', 'co'),
    FOREIGN KEY (code1, number1) REFERENCES Course(code, number),
    FOREIGN KEY (code2, number2) REFERENCES Course(code, number)
);

CREATE TABLE CoursePool (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE DegreeXCoursePool (
    id VARCHAR(255) PRIMARY KEY,
    degree VARCHAR(255),
    coursepool VARCHAR(255),
    creditsRequired INT NOT NULL,
    required BOOLEAN NOT NULL,
    UNIQUE (degree, coursepool),
    FOREIGN KEY (degree) REFERENCES Degree(id),
    FOREIGN KEY (coursepool) REFERENCES CoursePool(id)
);

CREATE TABLE CourseXCoursePool (
    id VARCHAR(255) PRIMARY KEY,
    coursenumber INT,
    coursecode VARCHAR(5),
    coursepool VARCHAR(255),
    UNIQUE (coursenumber, coursecode, coursepool),
    FOREIGN KEY (coursecode, coursenumber) REFERENCES Course(code, number),
    FOREIGN KEY (coursepool) REFERENCES CoursePool(id)
);

CREATE TABLE User (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('student', 'advisor', 'admin') NOT NULL
);

CREATE TABLE Timeline (
    id VARCHAR(255) PRIMARY KEY,
    season ENUM('fall', 'winter', 'summer1', 'summer2', 'fall/winter', 'summer') NOT NULL,
    year INT NOT NULL,
    coursenumber INT,
    coursecode VARCHAR(5),
    user VARCHAR(255),
    UNIQUE (user, coursecode, coursenumber, season, year),
    FOREIGN KEY (coursecode, coursenumber) REFERENCES Course(code, number),
    FOREIGN KEY (user) REFERENCES User(id)
);

CREATE TABLE Deficiency (
    id VARCHAR(255) PRIMARY KEY,
    coursepool VARCHAR(255),
    user VARCHAR(255),
    creditsRequired INT NOT NULL,
    UNIQUE (user, coursepool),
    FOREIGN KEY (coursepool) REFERENCES CoursePool(id),
    FOREIGN KEY (user) REFERENCES User(id)
);

CREATE TABLE Exemption (
    id VARCHAR(255) PRIMARY KEY,
    coursenumber INT,
    coursecode VARCHAR(5),
    user VARCHAR(255),
    UNIQUE (user, coursecode, coursenumber),
    FOREIGN KEY (coursecode, coursenumber) REFERENCES Course(code, number),
    FOREIGN KEY (user) REFERENCES User(id)
);
