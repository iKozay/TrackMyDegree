export const mockCourseData = {
    "pools": {
        "core": {
            "id": "core",
            "name": "Core Courses",
            "courseIds": [
                "MATH-201",
                "MATH-202",
                "COMP-232",
                "COMP-248",
                "COMP-249",
                "COMP-352",
                "COMP-346"
            ]
        },
        "computer-science": {
            "id": "computer-science",
            "name": "Computer Science",
            "courseIds": [
                "COMP-335",
                "COMP-345",
                "COMP-348",
                "COMP-371",
                "COMP-472",
                "COMP-473",
                "COMP-474"
            ]
        },
        "mathematics": {
            "id": "mathematics",
            "name": "Mathematics",
            "courseIds": [
                "MATH-203",
                "MATH-204",
                "MATH-251",
                "STAT-249"
            ]
        },
        "general-electives": {
            "id": "general-electives",
            "name": "General Electives",
            "courseIds": [
                "HIST-101",
                "PHIL-201",
                "ENGL-223",
                "PSYC-200"
            ]
        },
        "program-electives": {
            "id": "program-electives",
            "name": "Program Electives",
            "courseIds": [
                "COMP-445",
                "COMP-465",
                "COMP-479",
                "COMP-490"
            ]
        },
        "deficiency": {
            "id": "deficiency",
            "name": "Deficiency",
            "courseIds": [
                "MATH-095",
                "ENGL-096"
            ]
        },
        "exemption": {
            "id": "exemption",
            "name": "Exemption",
            "courseIds": []
        }
    },
    "courses": {
        "MATH-095": {
            "code": "MATH-095",
            "name": "Remedial Math",
            "credits": 0,
            "available": [
                "fall",
                "winter",
                "summer"
            ],
            "prereq": null,
            "corereq": null,
            "status": {
                "status": "completed",
                "semester": "summer-2024"
            }
        },
        "ENGL-096": {
            "code": "ENGL-096",
            "name": "Remedial English",
            "credits": 0,
            "available": [
                "fall",
                "winter",
                "summer"
            ],
            "prereq": null,
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "MATH-201": {
            "code": "MATH-201",
            "name": "Calculus I",
            "credits": 3,
            "available": [
                "fall",
                "winter"
            ],
            "prereq": [
                "MATH-095"
            ],
            "corereq": null,
            "status": {
                "status": "completed",
                "semester": "fall-2024"
            }
        },
        "MATH-202": {
            "code": "MATH-202",
            "name": "Calculus II",
            "credits": 3,
            "available": [
                "winter",
                "summer"
            ],
            "prereq": [
                "MATH-201"
            ],
            "corereq": null,
            "status": {
                "status": "inprogress",
                "semester": "winter-2025"
            }
        },
        "MATH-203": {
            "code": "MATH-203",
            "name": "Calculus III",
            "credits": 3,
            "available": [
                "fall"
            ],
            "prereq": [
                "MATH-202"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "MATH-204": {
            "code": "MATH-204",
            "name": "Linear Algebra",
            "credits": 3,
            "available": [
                "fall",
                "winter"
            ],
            "prereq": [
                "MATH-201"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "MATH-251": {
            "code": "MATH-251",
            "name": "Discrete Mathematics",
            "credits": 3,
            "available": [
                "fall",
                "winter"
            ],
            "prereq": [
                "MATH-201"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "STAT-249": {
            "code": "STAT-249",
            "name": "Statistics",
            "credits": 3,
            "available": [
                "fall",
                "winter",
                "summer"
            ],
            "prereq": [
                "MATH-201"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "COMP-232": {
            "code": "COMP-232",
            "name": "Mathematics for CS",
            "credits": 3,
            "available": [
                "fall",
                "winter"
            ],
            "prereq": [
                "MATH-201"
            ],
            "corereq": null,
            "status": {
                "status": "inprogress",
                "semester": "winter-2025"
            }
        },
        "COMP-248": {
            "code": "COMP-248",
            "name": "Object-Oriented Programming I",
            "credits": 3,
            "available": [
                "fall",
                "winter",
                "summer"
            ],
            "prereq": null,
            "corereq": null,
            "status": {
                "status": "completed",
                "semester": "fall-2024"
            }
        },
        "COMP-249": {
            "code": "COMP-249",
            "name": "Object-Oriented Programming II",
            "credits": 3,
            "available": [
                "winter",
                "summer"
            ],
            "prereq": [
                "COMP-248"
            ],
            "corereq": null,
            "status": {
                "status": "planned",
                "semester": "summer-2025"
            }
        },
        "COMP-335": {
            "code": "COMP-335",
            "name": "Introduction to Theoretical CS",
            "credits": 3,
            "available": [
                "fall"
            ],
            "prereq": [
                "COMP-249",
                "MATH-251"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "COMP-345": {
            "code": "COMP-345",
            "name": "Advanced Program Design",
            "credits": 3,
            "available": [
                "fall",
                "winter"
            ],
            "prereq": [
                "COMP-249"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "COMP-346": {
            "code": "COMP-346",
            "name": "Operating Systems",
            "credits": 3,
            "available": [
                "fall",
                "winter"
            ],
            "prereq": [
                "COMP-249",
                "COMP-232"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "COMP-348": {
            "code": "COMP-348",
            "name": "Principles of Programming Languages",
            "credits": 3,
            "available": [
                "winter"
            ],
            "prereq": [
                "COMP-249"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "COMP-352": {
            "code": "COMP-352",
            "name": "Data Structures and Algorithms",
            "credits": 3,
            "available": [
                "fall",
                "winter"
            ],
            "prereq": [
                "COMP-249",
                "COMP-232"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "COMP-371": {
            "code": "COMP-371",
            "name": "Computer Graphics",
            "credits": 3,
            "available": [
                "fall"
            ],
            "prereq": [
                "COMP-249",
                "MATH-204"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "COMP-445": {
            "code": "COMP-445",
            "name": "Computer Networks",
            "credits": 3,
            "available": [
                "winter"
            ],
            "prereq": [
                "COMP-346",
                "COMP-352"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "COMP-465": {
            "code": "COMP-465",
            "name": "Design and Analysis of Algorithms",
            "credits": 3,
            "available": [
                "fall"
            ],
            "prereq": [
                "COMP-352",
                "MATH-251"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "COMP-472": {
            "code": "COMP-472",
            "name": "Artificial Intelligence",
            "credits": 3,
            "available": [
                "fall",
                "winter"
            ],
            "prereq": [
                "COMP-352",
                "STAT-249"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "COMP-473": {
            "code": "COMP-473",
            "name": "Pattern Recognition",
            "credits": 3,
            "available": [
                "winter"
            ],
            "prereq": [
                "COMP-472",
                "MATH-204"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "COMP-474": {
            "code": "COMP-474",
            "name": "Intelligent Systems",
            "credits": 3,
            "available": [
                "fall"
            ],
            "prereq": [
                "COMP-472"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "COMP-479": {
            "code": "COMP-479",
            "name": "Advanced AI",
            "credits": 3,
            "available": [
                "winter"
            ],
            "prereq": [
                "COMP-472",
                "COMP-473"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "COMP-490": {
            "code": "COMP-490",
            "name": "Capstone Project",
            "credits": 6,
            "available": [
                "fall",
                "winter"
            ],
            "prereq": [
                "COMP-345",
                "COMP-352"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "HIST-101": {
            "code": "HIST-101",
            "name": "World History",
            "credits": 3,
            "available": [
                "fall",
                "winter"
            ],
            "prereq": null,
            "corereq": null,
            "status": {
                "status": "planned",
                "semester": "fall-2025"
            }
        },
        "PHIL-201": {
            "code": "PHIL-201",
            "name": "Logic and Critical Thinking",
            "credits": 3,
            "available": [
                "fall",
                "winter",
                "summer"
            ],
            "prereq": null,
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "ENGL-223": {
            "code": "ENGL-223",
            "name": "Technical Writing",
            "credits": 3,
            "available": [
                "fall",
                "winter"
            ],
            "prereq": [
                "ENGL-096"
            ],
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        },
        "PSYC-200": {
            "code": "PSYC-200",
            "name": "Introduction to Psychology",
            "credits": 3,
            "available": [
                "fall",
                "winter",
                "summer"
            ],
            "prereq": null,
            "corereq": null,
            "status": {
                "status": "available",
                "semester": null
            }
        }
    },
    "semesters": {
        "summer-2024": [
            "MATH-095"
        ],
        "fall-2024": [
            "MATH-201",
            "COMP-248"
        ],
        "winter-2025": [
            "MATH-202",
            "COMP-232"
        ],
        "summer-2025": [
            "COMP-249"
        ],
        "fall-2025": [
            "HIST-101"
        ],
        "winter-2026": [],
        "summer-2026": [],
        "fall-2026": [],
        "winter-2027": [],
        "summer-2027": [],
        "fall-2027": [],
        "winter-2028": []
    }
}