// TimelinePage.js

import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, time } from "framer-motion"
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Accordion from 'react-bootstrap/Accordion';
import Container from 'react-bootstrap/Container';
import warningIcon from '../icons/warning.png'; // Import warning icon
import '../css/TimelinePage.css';
import { groupPrerequisites } from '../utils/groupPrerequisites'; // Adjust the path as necessary
import { useLocation } from 'react-router-dom';
// DraggableCourse component for course list items
const DraggableCourse = ({
  id,
  title,
  disabled,
  isReturning,
  isSelected,
  onSelect,
  containerId,
  className: extraClassName, // NEW prop
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled,
    data: { type: 'course', courseCode: id, containerId },
  });

  const className = `course-item${disabled ? ' disabled' : ''}${isDragging ? ' dragging' : ''
    }${isSelected && !isDragging && !disabled ? ' selected' : ''}${extraClassName ? ' ' + extraClassName : ''
    }`;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      {id}
    </div>
  );
};


// SortableCourse component for semester items
const SortableCourse = ({
  id,
  title,
  disabled,
  isSelected,
  isDraggingFromSemester,
  onSelect,
  containerId,
  prerequisitesMet, // New prop
  removeButton,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: 'course',
      courseCode: id,
      containerId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const className = `course-item${disabled ? ' disabled' : ''}${isDragging ? ' dragging' : ''
    }${isDraggingFromSemester ? ' dragging-from-semester' : ''}${isSelected ? ' selected' : ''
    }`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      {id}
      {!prerequisitesMet && (
        <img
          src={warningIcon}
          alt="Warning: prerequisites not met"
          className="warning-icon"
        />
      )}
      {removeButton}
    </div>
  );
};

// Droppable component
const Droppable = ({ id, children, className = 'semester-spot' }) => {
  const { setNodeRef } = useDroppable({
    id,
    data: {
      type: 'semester',
      containerId: id,
    },
  });

  return (
    <div ref={setNodeRef} className={className} data-semester-id={id} data-testid={id}>
      {children}
    </div>
  );
};

// Main component
const TimelinePage = ({ degreeid, timelineData, creditsrequired, isExtendedCredit }) => {
  const navigate = useNavigate();
  const [showCourseList, setShowCourseList] = useState(true);
  const [showCourseDescription, setShowCourseDescription] = useState(true);

  const [semesters, setSemesters] = useState([]);
  const [semesterCourses, setSemesterCourses] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isECP, setIsECP] = useState(false);

  // Flatten and filter courses from all pools based on the search query



  const userData = localStorage.getItem('user');
  const user = JSON.parse(userData);
  const location = useLocation();

  const scrollWrapperRef = useRef(null);
  const autoScrollInterval = useRef(null);


  let { degreeId, startingSemester, creditsRequired = 120, extendedCredit } = location.state || {};

  // console.log("isExtendedCredit: " + isExtendedCredit);
  // console.log("extendedCredit: " + extendedCredit);

  if (isExtendedCredit) {
    extendedCredit = true;
  }

  if (isExtendedCredit === null && extendedCredit === null) {
    extendedCredit = false;
  }

  // setIsECP(extendedCredit);

  if (!degreeId) {
    degreeId = degreeid;
  }

  if (!creditsrequired) {
    creditsRequired = 120;
  }

  if (extendedCredit) {
    creditsRequired += 30;
  }

  //console.log(degreeId);  // Logs the degreeId passed from UploadTranscriptPage.js
  //console.log(extendedCredit); // Logs the timelineData passed from UploadTranscriptPage.js

  // Data
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 767);
  const [addButtonText, setAddButtonText] = useState('+ Add Semester');

  const [activeId, setActiveId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [returning, setReturning] = useState(false);
  const [hasUnmetPrerequisites, setHasUnmetPrerequisites] = useState(false);
  const [totalCredits, setTotalCredits] = useState(0);

  // Add semester form state
  const [selectedSeason, setSelectedSeason] = useState('Fall');
  const [selectedYear, setSelectedYear] = useState('2025');
  // Fetching state
  const [coursePools, setCoursePools] = useState([]);
  const [deficiencyCredits, setDeficiencyCredits] = useState(0);
  const [deficiencyCourses, setDeficiencyCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toggleCourseList = () => setShowCourseList((prev) => !prev);
  const toggleCourseDescription = () => setShowCourseDescription((prev) => !prev);

  const [allCourses, setAllCourses] = useState([]);
  const [showExempted, setShowExempted] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [timelineName, setTimelineName] = useState('');
  const [tempName, setTempName] = useState('');


  let DEFAULT_EXEMPTED_COURSES = [];
  if (!extendedCredit) {
    DEFAULT_EXEMPTED_COURSES = [
      'MATH201',
      'MATH203',
      'MATH204',
      'MATH205',
      'MATH206',
      'CHEM205',
      'PHYS204',
      'PHYS205',
    ]
  }
  else {
    DEFAULT_EXEMPTED_COURSES = [
      'MATH201',
      'MATH206',
    ]
  }

  // NEW: Fetch all courses from /courses/getAllCourses
  useEffect(() => {
    const fetchAllCourses = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_SERVER}/courses/getAllCourses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch all courses');
        }
        const data = await response.json();
        setAllCourses(data);
      } catch (err) {
        console.error("Error fetching all courses", err);
      }
    };

    fetchAllCourses();

    if (localStorage.getItem("Timeline_Name")) {
      if (localStorage.getItem("Timeline_Name") !== "" && localStorage.getItem("Timeline_Name") !== 'null' && localStorage.getItem("Timeline_Name") !== null) {
        setTimelineName(localStorage.getItem("Timeline_Name"));
        setTempName(localStorage.getItem("Timeline_Name"));
      } else {
        setTimelineName("");
        setTempName("");
      }

      //console.log("Timeline Name Local Storage: ", localStorage.getItem("Timeline_Name"));
      //console.log("Timeline Name: ", timelineName);
    }
    setIsECP(extendedCredit);
  }, []);

  // NEW: Compute remaining courses not in the degree's course pools
  const normalizedDegreeCourseCodes = new Set(
    coursePools.flatMap(pool => pool.courses.map(course => course.code.trim().toUpperCase()))
  );

  const remainingCourses = allCourses.filter(
    course => !normalizedDegreeCourseCodes.has(course.code.trim().toUpperCase())
  );


  // Sensors with activation constraints
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 100,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // Helper function to generate 2 years of semesters (6 semesters for 3 terms per year)
  const generateFourYearSemesters = (startSem) => {
    const termOrder = ["Winter", "Summer", "Fall"];
    const parts = startSem.split(" ");
    if (parts.length < 2) return [];
    let currentTerm = parts[0];
    let currentYear = parseInt(parts[1], 10);
    const semesters = [];
    for (let i = 0; i < 12; i++) {
      semesters.push(`${currentTerm} ${currentYear}`);
      // Get next term
      let currentIndex = termOrder.indexOf(currentTerm);
      currentIndex++;
      if (currentIndex >= termOrder.length) {
        currentIndex = 0;
        currentYear++;
      }
      currentTerm = termOrder[currentIndex];
    }
    return semesters;
  };

  // Fetch courses by degree on component mount
  useEffect(() => {
    const fetchCoursesByDegree = async () => {
      try {
        // console.log('Fetching courses by degree:', degreeId);
        const primaryResponse = await fetch(`${process.env.REACT_APP_SERVER}/courses/getByDegreeGrouped`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ degree: degreeId }),
        });
        if (!primaryResponse.ok) {
          const errorData = await primaryResponse.json();
          throw new Error(errorData.error || `HTTP error! status: ${primaryResponse.status}`);
        }
        const primaryData = await primaryResponse.json();

        let combinedData = primaryData;

        if (extendedCredit) {
          const extendedResponse = await fetch(`${process.env.REACT_APP_SERVER}/courses/getByDegreeGrouped`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ degree: 'ECP' }),
          });
          if (!extendedResponse.ok) {
            const errorData = await extendedResponse.json();
            throw new Error(errorData.error || `HTTP error! status: ${extendedResponse.status}`);
          }
          const extendedData = await extendedResponse.json();
          combinedData = primaryData.concat(extendedData);
        }

        if (location.state?.creditDeficiency) {
          const deficiencyPool = {
            poolName: 'Deficiencies',
            poolId: 'def-pool',
            courses: [
              {
                code: 'ESL202',
                title: 'ESL 202',
                credits: 3,
                description: 'Deficiency course',
                requisites: [],
              },
              {
                code: 'ESL204',
                title: 'ESL 204',
                credits: 4,
                description: 'Deficiency course',
                requisites: [],
              },
            ],
          };
          if (!combinedData.find((pool) => pool.poolId === 'def-pool')) {
            combinedData = [...combinedData, deficiencyPool];
            const totalDefCredits = deficiencyPool.courses.reduce(
              (sum, course) => sum + (course.credits || 0),
              0
            );
            setDeficiencyCredits(totalDefCredits);
          }
        }

        setCoursePools(combinedData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchCoursesByDegree();
  }, [degreeId, location.state?.creditDeficiency, extendedCredit]);


  // Process timelineData and generate semesters and courses
  useEffect(() => {
    // Wait until coursePools have loaded.

    // console.log('coursePools:', coursePools);
    if (coursePools.length === 0) {
      console.log('Returning early, not building timeline yet.');
      return;
    }


    // --- Step 1. Separate exempted data from regular timelineData ---
    const nonExemptedData = [];
    let parsedExemptedCourses = [];

    if (timelineData.length > 0) {
      timelineData.forEach((data) => {
        let isExempted = false;
        // Check the old format: data.term
        if (data.term && typeof data.term === "string") {
          isExempted = data.term.trim().toLowerCase() === "exempted 2020";
        }
        // Check the new format: data.season and data.year
        else if (data.season && data.year) {
          isExempted =
            data.season.trim().toLowerCase() === "exempted" &&
            parseInt(data.year, 10) === 2020;
        }

        if (isExempted) {
          // Extract courses from the exempted item.
          if (data.course && typeof data.course === "string") {
            parsedExemptedCourses.push(data.course.trim());
          } else if (Array.isArray(data.courses)) {
            data.courses.forEach((course) => {
              if (typeof course === "string") {
                parsedExemptedCourses.push(course.trim());
              }
            });
          }
        } else {
          // Add every timelineData item—even if courses is empty.
          nonExemptedData.push(data);
        }
      });
    } else {

      if (extendedCredit === null) {
        extendedCredit = false;
      }
      // console.log("eC: " + extendedCredit);
      // No timeline data available; use preset exempted courses.
      if (!extendedCredit) {
        parsedExemptedCourses = [
          'MATH201',
          'MATH203',
          'MATH204',
          'MATH205',
          'MATH206',
          'CHEM205',
          'PHYS204',
          'PHYS205',
        ];
      } else {
        parsedExemptedCourses = [
          'MATH201',
          'MATH206',
        ];
      }
    }

    // Remove duplicates.
    parsedExemptedCourses = [...new Set(parsedExemptedCourses)];

    // --- Step 2. Build the semester map from non-exempted data ---
    const semesterMap = {};
    const semesterNames = new Set();

    nonExemptedData.forEach((data) => {
      let term = "";
      // Default courses to an empty array if not provided.
      let courses = Array.isArray(data.courses)
        ? data.courses
          .map((course) => (typeof course === "string" ? course.trim() : ""))
          .filter(Boolean)
        : [];

      if (data.term && typeof data.term === "string") {
        term = data.term;
        // For old format, also check for a single course.
        if (data.course && typeof data.course === "string") {
          courses.push(data.course.trim());
        }
      } else if (data.season && data.year) {
        term =
          data.season.trim().toLowerCase() === "exempted"
            ? "Exempted"
            : `${data.season} ${data.year}`;
      }

      if (term) {
        // Even if courses is empty, create the semester.
        if (!semesterMap[term]) {
          semesterMap[term] = [];
        }
        semesterMap[term].push(...courses);
        semesterNames.add(term);
      }

    });

    // If a startingSemester is provided, generate missing empty semesters.
    if (startingSemester) {
      const generatedSemesters = generateFourYearSemesters(startingSemester);
      generatedSemesters.forEach((sem) => {
        if (!semesterNames.has(sem)) {
          semesterNames.add(sem);
          semesterMap[sem] = []; // This semester remains empty.
        }
      });
    }

    // --- Step 3. Insert the parsed exempted courses as a dedicated "Exempted" term ---
    if (parsedExemptedCourses.length > 0) {
      const exemptedKey = "Exempted";
      semesterNames.add(exemptedKey);
      if (!semesterMap[exemptedKey]) {
        semesterMap[exemptedKey] = [];
      }
      parsedExemptedCourses.forEach((courseCode) => {
        if (!semesterMap[exemptedKey].includes(courseCode)) {
          semesterMap[exemptedKey].push(courseCode);
        }
      });
    }

    // --- Step 4. Sort the semesters ---
    const sortedSemesters = Array.from(semesterNames).sort((a, b) => {
      if (a.trim().toLowerCase() === "exempted") return -1;
      if (b.trim().toLowerCase() === "exempted") return 1;
      const order = { Winter: 1, Summer: 2, Fall: 3 };
      const [seasonA, yearA] = a.split(" ");
      const [seasonB, yearB] = b.split(" ");
      if (yearA !== yearB) {
        return parseInt(yearA, 10) - parseInt(yearB, 10);
      }
      return order[seasonA] - order[seasonB];
    });

    // --- Step 5. Update state ---
    setSemesters(
      sortedSemesters.map((term) => ({
        id: term,
        name: term,
      }))
    );
    setSemesterCourses(
      Object.fromEntries(
        sortedSemesters.map((term) => [term, semesterMap[term] || []])
      )
    );
    console.log("Building semesterMap from timelineData:", timelineData);
    console.log("Resulting semesterMap:", semesterMap);


  }, [timelineData, coursePools, extendedCredit, startingSemester]);





  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 767);
      if (window.innerWidth > 999) {
        setAddButtonText('+ Add Semester');
      }
      else {
        setAddButtonText('+');
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setShowCourseList(false);
      setShowCourseDescription(false);
    }
  }, [isDesktop]);

  const [shakingSemesterId, setShakingSemesterId] = useState(null);

  // ---------------- ADD / REMOVE Semesters ----------------
  const SEASON_ORDER = {
    Winter: 1,
    Summer: 2,
    Fall: 3,
  };

  function compareSemesters(a, b) {
    // a.name might be "Fall 2026" => [ "Fall", "2026" ]
    const [seasonA, yearA] = a.name.split(' ');
    const [seasonB, yearB] = b.name.split(' ');

    // Convert year from string to number
    const yearNumA = parseInt(yearA, 10);
    const yearNumB = parseInt(yearB, 10);

    // First compare the numeric year
    if (yearNumA !== yearNumB) {
      return yearNumA - yearNumB;
    }
    // If same year, compare season order
    return SEASON_ORDER[seasonA] - SEASON_ORDER[seasonB];
  }

  const handleAddSemester = () => {
    const id = `${selectedSeason} ${selectedYear}`;
    const name = `${selectedSeason} ${selectedYear}`;

    // Prevent duplicates
    if (semesters.some((sem) => sem.id === id)) {
      alert(`Semester ${name} is already added.`);
      return;
    }

    // 1) Add the new semester to the "semesters" array, then sort
    setSemesters((prev) => {
      const newSemesters = [...prev, { id, name }];
      newSemesters.sort(compareSemesters);
      return newSemesters;
    });

    setSemesterCourses((prev) => {
      if (!prev[id]) {
        return { ...prev, [id]: [] };
      }
      return prev;
    });

    setIsModalOpen(false);
  };

  const handleRemoveSemester = (semesterId) => {
    setSemesters((prev) => prev.filter((s) => s.id !== semesterId));
    setSemesterCourses((prev) => {
      const updated = { ...prev };
      delete updated[semesterId];
      return updated;
    });
  };

  // ----------------------------------------------------------------------
  const isCourseAssigned = (courseCode) => {
    for (const semesterId in semesterCourses) {
      if (semesterId === "courseList") continue;
      if (semesterCourses[semesterId].includes(courseCode)) {
        return true;
      }
    }
    return false;
  };

  const handleDragStart = (event) => {
    setReturning(false);
    const id = String(event.active.id);

    const course = allCourses.find((c) => c.code === id);


    if (course) {
      setSelectedCourse(course);
    }

    // document.querySelector('.semesters')?.classList.add('no-scroll');

    setActiveId(id);
  };

  const findSemesterIdByCourseCode = (courseCode, semesters) => {
    for (const semesterId in semesters) {
      if (semesters[semesterId].includes(courseCode)) {
        return semesterId;
      }
    }
    return null;
  };

  const shakeSemester = (semId) => {
    setShakingSemesterId(semId);
    setTimeout(() => {
      setShakingSemesterId(null);
    }, 2000);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    const id = String(active.id); // courseCode

    if (over) {
      if (over.id === 'courseList' || over.id === 'courses-with-button') {
        // Course is being returned to the course list
        handleReturn(id);
      } else {
        setSemesterCourses((prevSemesters) => {
          const updatedSemesters = { ...prevSemesters };
          const activeSemesterId = findSemesterIdByCourseCode(
            id,
            prevSemesters
          );
          let overSemesterId;
          let overIndex;

          if (over.data.current?.type === 'semester') {
            // Dropped over a semester (empty space)
            overSemesterId = over.data.current.containerId;
            overIndex = updatedSemesters[overSemesterId].length;
          } else if (over.data.current?.type === 'course') {
            // Dropped over a course in a semester
            overSemesterId = over.data.current.containerId;
            overIndex = updatedSemesters[overSemesterId].indexOf(over.id);

            if (id === over.id) {
              // Dropped back onto itself; do nothing
              return prevSemesters;
            }
          } else {
            // Fallback
            overSemesterId = findSemesterIdByCourseCode(over.id, prevSemesters);
            overIndex = updatedSemesters[overSemesterId]?.indexOf(over.id);
          }

          if (activeSemesterId) {
            // Remove from old semester
            updatedSemesters[activeSemesterId] = updatedSemesters[
              activeSemesterId
            ].filter((courseCode) => courseCode !== id);
          }

          if (overSemesterId) {
            // Insert into new semester
            updatedSemesters[overSemesterId].splice(overIndex, 0, id);
          }

          // Check if we exceed the limit
          const overSemesterObj = semesters.find((s) => s.id === overSemesterId);
          if (!overSemesterObj) return prevSemesters; // safety check

          // Sum up the credits in the new semester
          const thisSemesterCourses = updatedSemesters[overSemesterId];
          let sumCredits = 0;
          for (let cCode of thisSemesterCourses) {
            const course = allCourses.find((c) => c.code === cCode);

            if (course?.credits) {
              sumCredits += course.credits;
            }
          }

          // Compare with max
          const maxAllowed = getMaxCreditsForSemesterName(overSemesterObj.name);

          if (sumCredits > maxAllowed) {
            shakeSemester(overSemesterId);
          }
          return updatedSemesters;
        });
      }
    }

    setActiveId(null);
    document.querySelector('.semesters')?.classList.remove('no-scroll');
  };

  const handleDragCancel = () => {
    setActiveId(null);
    document.querySelector('.semesters')?.classList.remove('no-scroll');
  };

  const handleReturn = (courseCode) => {
    setReturning(true);

    setSemesterCourses((prevSemesters) => {
      const updatedSemesters = { ...prevSemesters };
      for (const semesterId in updatedSemesters) {
        updatedSemesters[semesterId] = updatedSemesters[semesterId].filter(
          (code) => code !== courseCode
        );
      }
      return updatedSemesters;
    });
  };

  const handleCourseSelect = (code) => {
    const course = allCourses.find((c) => c.code === code);

    if (course) {
      setSelectedCourse(course);
    }
  };

  const ECP_EXTRA_CREDITS = 30; // Extra credits for ECP students

  // Calculate total credits whenever semesterCourses changes
  useEffect(() => {
    const calculateTotalCredits = () => {
      let unmetPrereqFound = false;

      // Build a map: poolId -> { assigned: number, max: number }
      // assigned is how many credits we've added so far
      // max is parsed from the pool name
      const poolCreditMap = {};

      // Initialize each pool with a max credits limit
      coursePools.forEach((pool) => {
        const maxFromName = parseMaxCreditsFromPoolName(pool.poolName);
        poolCreditMap[pool.poolId] = {
          assigned: 0,
          max: maxFromName,
        };
      });

      // Add remaining courses to the poolCreditMap with no pool-specific maximum
      remainingCourses.forEach((course) => {
        const poolId = 'remaining'; // A generic pool for remaining courses
        if (!poolCreditMap[poolId]) {
          poolCreditMap[poolId] = {
            assigned: 0,
            max: Infinity, // No max limit for remaining courses
          };
        }
      });

      // Go through each semester (EXCEPT 'Exempted') and sum assigned credits
      for (const semesterId in semesterCourses) {
        if (semesterId.toLowerCase() === 'exempted') {
          // Skip counting courses in 'Exempted'
          continue;
        }

        const courseCodes = semesterCourses[semesterId];
        const currentSemesterIndex = semesters.findIndex((s) => s.id === semesterId);

        courseCodes.forEach((courseCode) => {
          // Find which pool this course belongs to
          let pool = coursePools.find((p) =>
            p.courses.some((c) => c.code === courseCode)
          );

          // If not in coursePools, check if it belongs to remainingCourses
          if (!pool) {
            pool = { poolId: 'remaining', courses: remainingCourses }; // Use the remaining pool
          }

          if (!pool) return; // course not found in any pool (shouldn't happen, but just in case)

          // Find the actual course object
          const course = pool.courses.find((c) => c.code === courseCode);
          if (!course) return;

          // Check prerequisites
          const prerequisitesMet = arePrerequisitesMet(courseCode, currentSemesterIndex);
          if (!prerequisitesMet) {
            unmetPrereqFound = true;
          }

          // Add credits to the pool’s assigned sum, up to the pool’s max
          const poolData = poolCreditMap[pool.poolId];
          const newSum = poolData.assigned + (course.credits || 0);
          poolData.assigned = Math.min(poolData.max, newSum);
        });
      }

      // Sum up the assigned credits from all pools
      const total = Object.values(poolCreditMap).reduce(
        (sum, poolData) => sum + poolData.assigned,
        0
      );

      setTotalCredits(total);
      setHasUnmetPrerequisites(unmetPrereqFound);
    };

    calculateTotalCredits();
  }, [semesterCourses, semesters, coursePools, deficiencyCredits]);



  // Function to check if prerequisites and corequisites are met
  const arePrerequisitesMet = (courseCode, currentSemesterIndex) => {
    const course = allCourses.find((c) => c.code === courseCode);

    // console.log(`Checking prerequisites for course ${courseCode} in semester index ${currentSemesterIndex}`);

    if (!course || !course.requisites || course.requisites.length === 0) {
      // console.log(`Course ${courseCode} has no requisites.`);
      return true;
    }

    // Separate prerequisites and corequisites
    const prerequisites = course.requisites.filter(r => r.type.toLowerCase() === 'pre');
    const corequisites = course.requisites.filter(r => r.type.toLowerCase() === 'co');

    // console.log(`Course ${courseCode} prerequisites:`, prerequisites);
    // console.log(`Course ${courseCode} corequisites:`, corequisites);

    // Collect all courses scheduled in semesters before the current one
    const completedCourses = [];
    for (let i = 0; i < currentSemesterIndex; i++) {
      const semesterId = semesters[i]?.id;
      if (semesterId === 'Exempted') {
        completedCourses.push(...(semesterCourses[semesterId] || []));
      } else {
        // Add courses from regular semesters too.
        completedCourses.push(...(semesterCourses[semesterId] || []));
      }
    }

    // console.log(`Completed courses before current semester:`, completedCourses);

    // Check prerequisites
    const prerequisitesMet = prerequisites.every((prereq) => {
      if (prereq.group_id) {
        // For grouped prerequisites, at least one in the group must be completed
        const group = prerequisites.filter(p => p.group_id === prereq.group_id);
        const result = group.some(p => completedCourses.includes(p.code2));
        // console.log(`Group ${prereq.group_id} met:`, result);
        return result;
      } else {
        // Single prerequisite
        const result = completedCourses.includes(prereq.code2);
        // console.log(`Prerequisite ${prereq.code2} met:`, result);
        return result;
      }
    });

    // console.log(`Prerequisites met for course ${courseCode}:`, prerequisitesMet);

    // Collect courses scheduled in the current semester for corequisites
    const currentSemesterCourses = semesterCourses[semesters[currentSemesterIndex]?.id] || [];
    // console.log(`Current semester courses for corequisites:`, currentSemesterCourses);

    // Check corequisites
    const corequisitesMet = corequisites.every((coreq) => {
      if (coreq.group_id) {
        // If corequisites can also be grouped, handle similarly
        const group = corequisites.filter(c => c.group_id === coreq.group_id);
        const result = group.some(c => currentSemesterCourses.includes(c.code2));
        // console.log(`Corequisite group ${coreq.group_id} met:`, result);
        return result;
      } else {
        // Single corequisite
        const result = currentSemesterCourses.includes(coreq.code1);
        // console.log(`Corequisite ${coreq.code2} met:`, result);
        return result;
      }
    });

    // console.log(`Corequisites met for course ${courseCode}:`, corequisitesMet);

    const finalResult = prerequisitesMet && corequisitesMet;
    // console.log(`Prerequisites and Corequisites met for course ${courseCode}:`, finalResult);

    return finalResult;
  };


  // The Gina Cody School of Engineering and Computer Science at Concordia University has the following credit limits for full-time students:
  // limit is 14 summer; Fall Winter 15.
  function getMaxCreditsForSemesterName(semesterName) {
    if (semesterName.toLowerCase().includes("summer")) {
      return 14;
    }
    return 15;
  }

  function parseMaxCreditsFromPoolName(poolName) {
    // Regex to find e.g. "(47.5 credits)"
    const match = poolName.match(/\(([\d.]+)\s*credits?\)/i);
    if (match) {
      return parseFloat(match[1]);  // 47.5
    }
    return Infinity; // fallback if we can't parse a number
  }

  //   // Optionally log the data for debugging purposes
  //   //console.log('Saved Timeline:', timelineData);
  // };
  const confirmSaveTimeline = async (tName) => {
    // Ensure a valid timeline name is provided.
    if (!tName.trim()) {
      alert("Timeline name is required!");
      return;
    }
    setTimelineName(tName);

    if (!user) {
      navigate('/signin');
      return;
    }

    // Build final timeline data from all semesters.
    const finalTimelineData = [];
    const exempted_courses = [];

    semesters.forEach((semester) => {
      // Split the semester name into season and year.
      const [season, year = "2020"] = semester.name.split(" ");

      // If this semester is "Exempted" or "Transfered Courses", collect its courses.
      if (
        semester.id.trim().toLowerCase() === "exempted" ||
        semester.id.trim().toLowerCase() === "transfered courses"
      ) {
        (semesterCourses[semester.id] || []).forEach((courseCode) => {
          const course = allCourses.find((c) => c.code === courseCode);
          if (course && course.code) {
            exempted_courses.push(course.code);
          } else {
            console.warn(`Course not found or missing code for: ${courseCode}`);
          }
        });
      }

      // Build the courses array for this semester.
      const coursesForSemester = (semesterCourses[semester.id] || [])
        .map((courseCode) => {
          const course = allCourses.find((c) => c.code === courseCode);
          return course && course.code ? { courseCode: course.code } : null;
        })
        .filter(Boolean);

      // Convert year to integer.
      const yearInt = isNaN(parseInt(year, 10)) ? 2020 : parseInt(year, 10);

      // Always include the semester, even if it has no courses.
      finalTimelineData.push({
        season,
        year: yearInt,
        courses: coursesForSemester,
      });
    });

    if (finalTimelineData.length === 0 && exempted_courses.length === 0) {
      alert("No valid data to save.");
      return;
    }

    // Build the payload for the timeline.
    const userTimeline = [{
      user_id: user.id,
      name: tName,
      items: finalTimelineData.map((item) => ({
        season: item.season,
        year: item.year,
        courses: item.courses.map((course) => course.courseCode),
      })),
      isExtendedCredit: extendedCredit || false,
    }];

    const user_id = userTimeline[0].user_id;
    const timelineNameToSend = userTimeline[0].name;
    const items = userTimeline[0].items;
    const isExtendedCredit = userTimeline[0].isExtendedCredit;

    // Save Exempted Courses.
    try {
      const responseExemptions = await fetch(`${process.env.REACT_APP_SERVER}/exemption/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coursecodes: exempted_courses, user_id }),
      });
      const dataExemptions = await responseExemptions.json();
      if (!responseExemptions.ok) {
        alert("Error saving Exempted Courses: " + (dataExemptions.message || ""));
      }
    } catch (error) {
      console.error("Error saving Exempted Courses:", error);
      alert("An error occurred while saving your timeline.");
    }

    // Save deficiency courses.
    try {
      const responseDeficiency = await fetch(`${process.env.REACT_APP_SERVER}/deficiency/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coursepool: deficiencyCourses,
          user_id,
          creditsRequired: deficiencyCredits,
        }),
      });
      // Optionally check responseDeficiency here.
    } catch (err) {
      console.error("Error saving deficiency", err);
    }

    // Save the complete timeline.
    try {
      const responseTimeline = await fetch(`${process.env.REACT_APP_SERVER}/timeline/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, name: timelineNameToSend, items, degree_id: degreeId, isExtendedCredit }),
      });
      const dataTimeline = await responseTimeline.json();
      if (responseTimeline.ok) {
        alert('Timeline saved successfully!');
        setShowSaveModal(false); // Close the modal
        navigate('/user'); // Navigate after saving
      } else {
        alert("Error saving Timeline: " + (dataTimeline.message || ""));
      }
    } catch (error) {
      console.error("Error saving timeline:", error);
      alert("An error occurred while saving your timeline.");
    }
  };




  // Function to handle mouse move over the scrollable container
  const handleScrollMouseMove = (e) => {
    const wrapper = scrollWrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    // Calculate x position relative to the container
    const mouseX = e.clientX - rect.left;
    const threshold = 50;
    let direction = 0;

    if (mouseX < threshold) {
      direction = -1;
    } else if (mouseX > rect.width - threshold) {
      direction = 1;
    } else {
      direction = 0;
    }

    if (direction !== 0) {
      wrapper.classList.add("scrolling");
      if (!autoScrollInterval.current) {
        autoScrollInterval.current = setInterval(() => {
          // Adjust the speed
          wrapper.scrollLeft += direction * 15;
        }, 30);
      }
    } else {
      // Remove the visual cue and stop scrolling if mouse is not in the edge zone
      wrapper.classList.remove("scrolling");
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
      }
    }
  };

  const handleScrollMouseLeave = () => {
    const wrapper = scrollWrapperRef.current;
    if (!wrapper) return;
    wrapper.classList.remove("scrolling");
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  };
  // ----------------------------------------------------------------------------------------------------------------------
  return (

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >

        {/* We blur the background content when modal is open */}
        <div className={`timeline-container ${isModalOpen ? 'blurred' : ''}`}>

          {/* Loading and Error States */}
          {loading && (
            <div className="loading-container">
              <p>Loading courses...</p>
            </div>
          )}

          {error && (
            <div className="error-container">
              <p>Error: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Total Credits Display */}
              <div className="credits-display">
                <h4>
                  Total Credits Earned: {totalCredits} / {creditsRequired + deficiencyCredits}
                </h4>
                {/* Save Timeline Button */}
                <button
                  className="save-timeline-button"
                  onClick={() => timelineName ? confirmSaveTimeline(timelineName) : setShowSaveModal(true)}
                //onClick={() => setShowSaveModal(true)} // You can define this handler to save the transcript
                >
                  Save Timeline
                </button>
              </div>

              <div className="timeline-page">

                <Droppable className='courses-with-button' id="courses-with-button">
                  <div className={`timeline-left-bar ${showCourseList ? '' : 'hidden'}`}>
                    {showCourseList && (
                      <div>
                        <h4>Course List</h4>
                        {/* Search input field */}
                        <input
                          type="text"
                          placeholder="Search courses..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="course-search-input"
                        />

                        <div className="course-list-container-timeline">

                          <Droppable id="courseList" className="course-list" style={"color=red"}>
                            <Accordion>
                              {coursePools.map((coursePool) => {
                                // Determine if any course in this pool matches the search query.
                                const poolMatches =
                                  searchQuery.trim() === "" ||
                                  coursePool.courses.some(
                                    (course) =>
                                      course.code.toLowerCase().includes(searchQuery.toLowerCase())
                                  );
                                return (
                                  <Accordion.Item
                                    eventKey={coursePool.poolName}
                                    key={coursePool.poolId}
                                    className={searchQuery.trim() !== "" && !poolMatches ? "hidden-accordion" : ""}
                                  >
                                    <Accordion.Header>{coursePool.poolName}</Accordion.Header>
                                    <Accordion.Body>
                                      <Container>
                                        {coursePool.courses.map((course) => {
                                          const courseMatches =
                                            searchQuery.trim() === "" ||
                                            course.code.toLowerCase().includes(searchQuery.toLowerCase())
                                          return (
                                            <DraggableCourse
                                              key={`${course.code}-${isCourseAssigned(course.code)}`}
                                              id={course.code}
                                              title={course.code}
                                              disabled={isCourseAssigned(course.code)}
                                              isReturning={returning}
                                              isSelected={selectedCourse?.code === course.code}
                                              onSelect={handleCourseSelect}
                                              containerId="courseList"
                                              className={!courseMatches ? "hidden-course" : ""}
                                            />
                                          );
                                        })}
                                      </Container>
                                    </Accordion.Body>
                                  </Accordion.Item>
                                );
                              })}
                              {/* Similarly, for the Remaining Courses Accordion */}
                              <Accordion.Item
                                eventKey="remaining-courses"
                                key="remaining-courses"
                                className={
                                  searchQuery.trim() !== "" &&
                                    !remainingCourses.some(
                                      (course) =>
                                        course.code.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                    ? "hidden-accordion"
                                    : ""
                                }
                              >
                                <Accordion.Header>Remaining Courses</Accordion.Header>
                                <Accordion.Body>
                                  <Container>
                                    {remainingCourses.map((course) => {
                                      const courseMatches =
                                        searchQuery.trim() === "" ||
                                        course.code.toLowerCase().includes(searchQuery.toLowerCase())
                                      return (
                                        <DraggableCourse
                                          key={`${course.code}-${isCourseAssigned(course.code)}`}
                                          id={course.code}
                                          title={course.code}
                                          disabled={isCourseAssigned(course.code)}
                                          isReturning={returning}
                                          isSelected={selectedCourse?.code === course.code}
                                          onSelect={handleCourseSelect}
                                          containerId="courseList"
                                          className={!courseMatches ? "hidden-course" : ""}
                                        />
                                      );
                                    })}
                                  </Container>
                                </Accordion.Body>
                              </Accordion.Item>
                            </Accordion>
                          </Droppable>
                        </div>
                      </div>
                    )}
                  </div>

                  <button className="left-toggle-button" onClick={toggleCourseList}>
                    {showCourseList ? '◀' : '▶'}
                  </button>
                </Droppable>

                <div className="timeline-middle-section">
                  <div className='timeline-header'>
                    <div className='timeline-title'>
                      {{ timelineName } && { timelineName } != 'null' ? <h2>{timelineName}</h2> : <h2>My Timeline</h2>}
                    </div>
                    <button
                      className="add-semester-button"
                      onClick={() => setIsModalOpen(true)}
                    >
                      {addButtonText}
                    </button>
                  </div>

                  <div
                    className="timeline-scroll-wrapper"
                    ref={scrollWrapperRef}
                    onMouseMove={handleScrollMouseMove}
                    onMouseLeave={handleScrollMouseLeave}
                    onWheel={(e) => {
                      e.preventDefault();
                      e.currentTarget.scrollLeft += e.deltaY;
                    }}
                  >

                    <div className="semesters">
                      {semesters.map((semester, index) => {
                        // 1) Calculate total credits for this semester
                        const isExempted = semester.id.trim().toLowerCase().startsWith('exempted');

                        const sumCredits = semesterCourses[semester.id]
                        .map((cCode) => {
                          // Look for the course in both coursePools and remainingCourses
                          const courseInPool = coursePools
                            .flatMap((pool) => pool.courses)
                            .find((c) => c.code === cCode);
                  
                          // If course is not in coursePools, check in remainingCourses
                          const courseInRemaining = remainingCourses.find((c) => c.code === cCode);
                  
                          // Choose the course found in either pool or remaining courses
                          const course = courseInPool || courseInRemaining;
                  
                          return course ? course.credits : 0; // Return the course's credits or 0 if not found
                        })
                          .reduce((sum, c) => sum + c, 0);

                        // 2) Compare to max limit
                        const maxAllowed = getMaxCreditsForSemesterName(semester.name);
                        const isOver = sumCredits > maxAllowed;

                        // 3) “semester-credit” + conditionally add “over-limit-warning”
                        const creditClass = isOver
                          ? "semester-credit over-limit-warning"
                          : "semester-credit";

                        return (
                          <div key={semester.id} className={`semester ${isExempted ? "hidden-accordion" : ""} ${shakingSemesterId === semester.id ? 'exceeding-credit-limit' : ''
                            }`}>
                            <Droppable id={semester.id} color="pink">
                              <h3>{semester.name}</h3>
                              <SortableContext
                                items={semesterCourses[semester.id]}
                                strategy={verticalListSortingStrategy}
                              >
                                {semesterCourses[semester.id].map((courseCode) => {
                                  const course = allCourses.find((c) => c.code === courseCode);
                                  if (!course) return null;
                                  const isSelected = selectedCourse?.code === course.code;
                                  const isDraggingFromSemester = activeId === course.code;

                                  // Check if prerequisites are met
                                  const prerequisitesMet = arePrerequisitesMet(course.code, index);

                                  return (
                                    <SortableCourse
                                      key={course.code}
                                      id={course.code}
                                      title={course.code}
                                      disabled={false}
                                      isSelected={isSelected}
                                      isDraggingFromSemester={isDraggingFromSemester}
                                      onSelect={handleCourseSelect}
                                      containerId={semester.id}
                                      prerequisitesMet={prerequisitesMet} // Pass the prop
                                      removeButton={(
                                        <button
                                          className="remove-course-btn"
                                          onClick={() => handleReturn(course.code)}
                                        >
                                          <svg width="25" height="20" viewBox="0 0 30 24" fill="red" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="2" y="11" width="22" height="4" fill="red" />
                                          </svg>
                                        </button>
                                      )}
                                    />
                                  );
                                })}
                              </SortableContext>

                              <div className="semester-footer">
                                <div className={creditClass}>
                                  Total Credit: {sumCredits}
                                  {" "}
                                  {isOver && (
                                    <span>
                                      <br /> Over the credit limit {maxAllowed}
                                    </span>
                                  )}
                                </div>

                                <button
                                  className="remove-semester-btn"
                                  onClick={() => handleRemoveSemester(semester.id)}
                                >
                                  <svg
                                    width="1.2em"
                                    height="1.2em"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1.21 14.06A2 2 0 0 1 15.8 22H8.2a2 2 0 0 1-1.99-1.94L5 6m3 0V4a2 2 0 0 1 2-2h2
                                   a2 2 0 0 1 2 2v2" />
                                    <line x1="10" y1="11" x2="10" y2="17" />
                                    <line x1="14" y1="11" x2="14" y2="17" />
                                  </svg>
                                </button>
                              </div>
                            </Droppable>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className='description-and-button'>
                  <button className="right-toggle-button" onClick={toggleCourseDescription}>
                    {showCourseDescription ? '▶' : '◀'}
                  </button>
                  <div className={`description-section ${showCourseDescription ? '' : 'hidden'}`}>
                    {selectedCourse ? (
                      <div>
                        <h5>{selectedCourse.title}</h5>
                        <p>Credits: {selectedCourse.credits}</p>
                        <p data-testid='course-description'>{selectedCourse.description}</p>

                        {selectedCourse.requisites && (
                          <div>
                            <h5>Prerequisites/Corequisites:</h5>
                            <ul>
                              {groupPrerequisites(selectedCourse.requisites).map((group, index) => (
                                <li key={index}>
                                  {group.type.toLowerCase() === 'pre' ? 'Prerequisite: ' : 'Corequisite: '}
                                  {group.codes.join(' or ')}
                                </li>
                              ))}
                            </ul>
                            {selectedCourse.requisites.length === 0 && <ul><li>None</li></ul>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p data-testid='course-description'>Drag or click on a course to see its description here.</p>
                    )}
                  </div>

                </div>
                <DragOverlay dropAnimation={returning ? null : undefined}>
                  {activeId ? (
                    <div className="course-item-overlay selected">
                      {allCourses.find((course) => course.code === activeId)?.code}
                    </div>
                  ) : null}
                </DragOverlay>
              </div>
            </>
          )}

        </div>

        {/* ---------- Modal for Add Semester ---------- */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <button
                className="close-button"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>

              <p>Add a semester</p>
              <hr style={{ marginBottom: '1rem' }} />

              {/* Container for the two selects */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                {/* Term Select */}
                <div className="select-container">
                  <label className="select-label">Term</label>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                  >
                    <option>Winter</option>
                    <option>Summer</option>
                    <option>Fall</option>
                  </select>
                </div>

                {/* Year Select */}
                <div className="select-container">
                  <label className="select-label">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  >
                    {Array.from({ length: 14 }).map((_, i) => {
                      const year = 2017 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <button className="TL-button" onClick={handleAddSemester}>
                Add new semester
              </button>
            </div>
          </div>
        )}
        {showSaveModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <button
                className="close-button"
                // i want to conditionally call setshowsavemodal on whether or not timelineName is empty
                onClick={() => setShowSaveModal(false)}
              >
                ✕
              </button>

              <p>Save Timeline</p>
              <hr style={{ marginBottom: '1rem' }} />

              {/* Text input for the timeline name */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Enter a name for your timeline:
                </label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="e.g. My Winter Plan"
                  style={{ width: '100%', padding: '0.5rem' }}
                />
              </div>

              <button className="TL-button"
                onClick={() => {
                  // set timeline name as value of input field
                  if (tempName.trim() === "") {
                    setShowSaveModal(true);
                  } else {
                    confirmSaveTimeline(tempName);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </DndContext>
    </motion.div >
  );
};

export default TimelinePage;