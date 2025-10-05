/* eslint-disable prettier/prettier */
/* eslint-disable no-undef */
// TimelinePage.js

import React, { useState, useEffect, useRef, act, useContext, useMemo } from 'react';
import { useNavigate, useLocation, useBlocker, useSearchParams } from 'react-router-dom';
import { motion, time } from 'framer-motion'
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
import { Accordion, Button, Container } from "react-bootstrap";
import { FaUndo, FaRedo, FaClipboard, FaShareSquare } from "react-icons/fa";
import warningIcon from '../icons/warning.png'; // Import warning icon
import downloadIcon from '../icons/download-icon.PNG';
import saveIcon from '../icons/saveIcon.png';
import '../css/TimelinePage.css';
import { groupPrerequisites } from '../utils/groupPrerequisites';
import DeleteModal from "../components/DeleteModal";
import { TimelineError } from '../middleware/SentryErrors';
import * as Sentry from '@sentry/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import CourseSectionButton from '../components/SectionModal';
import ShowInsights from '../components/ShowInsights';
import { AuthContext } from '../middleware/AuthContext';
import { compressTimeline, decompressTimeline } from '../components/CompressDegree';

const REACT_APP_CLIENT = process.env.REACT_APP_CLIENT || 'localhost:3000' // Set client URL

// TODO: Exxtracting these components to a separate file (components/DraggableCourse.js etc.)

// DraggableCourse component for course list items
const DraggableCourse = ({
  internalId,
  courseCode,
  title,
  disabled,
  isReturning,
  isSelected,
  onSelect,
  containerId,
  className: extraClassName, // NEW prop
  isInTimeline, // NEW prop
  removeButton,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: internalId,
    disabled,
    data: { type: 'course', courseCode, containerId },
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
        onSelect(courseCode);
      }}
    >
      {courseCode}
      {isInTimeline && (
        <span className="checkmark-icon">✔</span>
        /* <img src={checkIcon} alt="In timeline" className="checkmark-icon" /> */
      )}
      {removeButton}
    </div>
  );
};

// SortableCourse component for semester items
const SortableCourse = ({
  internalId,
  courseCode,
  disabled,
  isSelected,
  isDraggingFromSemester,
  onSelect,
  containerId,
  prerequisitesMet, // New prop
  isOffered, // New prop
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
    id: internalId,
    data: {
      type: 'course',
      courseCode,
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

  // TODO: This function is recreated on every render, move outside component
  const getWarningMessage = () => {
    const warnings = [];
    if (!prerequisitesMet) {
      warnings.push('Prerequisites not met');
    }
    if (!isOffered) {
      warnings.push('Not offered in this term');
    }
    return warnings.join(', ');
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(courseCode);
      }}
    >
      {courseCode}
      {(!prerequisitesMet || !isOffered) && (
        <div className='warning-container'>
          <img
            src={warningIcon}
            alt="Warning: prerequisites not met"
            className="warning-icon"
          />
          <div className={`warning-tooltip ${isSelected ? 'selected' : ''}`}>{getWarningMessage()}</div>
        </div>
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
    <div
      ref={setNodeRef}
      className={className}
      data-semester-id={id}
      data-testid={id}
    >
      {children}
    </div>
  );
};

// TODO: This component is too large. Should be split into (in my opinion):
// - TimelineHeader (title, credits, action buttons)
// - CourseSidebar (left panel with course pools)
// - SemesterGrid (main drag-drop area)
// - CourseDescriptionPanel (right sidebar)
// This would improve maintainability and enable better code reuse

/**
 * TimelinePage Component - Interactive timeline builder and editor
 * 
 * Data Input Sources:
 * - UploadTranscript: Receives parsed transcript data (courses, terms, degree info, ECP status)
 * - UploadAcceptanceLetter: Receives degree selection, starting semester, program flags, exemptions
 * 
 * Core Function:
 * Transforms the extracted/selected data from upload pages into an interactive drag-and-drop 
 * academic timeline where students can:
 * - View parsed courses organized by semester
 * - Drag courses between semesters to plan their schedule  
 * - Add/remove semesters as needed
 * - Validate prerequisites and course offerings
 * - Monitor credit limits and degree progress
 * 
 * Key Outputs:
 * Saveable timeline to backend database - this means that the transcript/acceptance data is not 
 * directly stored, only the timeline of courses is sent to the backend and saved in the database
 */
const TimelinePage = ({ degreeId, timelineData, creditsRequired, isExtendedCredit }) => {

  // TODO: Too many use state hooks that are tighly coupled, consider useReducer or splitting into smaller components
  const navigate = useNavigate();
  const [showCourseList, setShowCourseList] = useState(true);
  const [showCourseDescription, setShowCourseDescription] = useState(true);
  const [showDeficiencyModal, setShowDeficiencyModal] = useState(false);
  const [showExemptionsModal, setShowExemptionsModal] = useState(false);
  const [searchDeficiencyQuery, setSearchDeficiencyQuery] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [semesterCourses, setSemesterCourses] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isECP, setIsECP] = useState(false);

  const [timelineString, setTimelineString] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [isShareVisible, setIsShareVisible] = useState(false);
  const [credsReq, setCredsReq] = useState(120);

  // Flatten and filter courses from all pools based on the search query

  const { login, isLoggedIn, user } = useContext(AuthContext);
  const location = useLocation();

  const scrollWrapperRef = useRef(null);
  // const autoScrollInterval = useRef(null);


  let { degree_Id, startingSemester, credits_Required, extendedCredit } = location.state || {};

  // console.log("degree_Id: " + degree_Id);
  // console.log("credits_Required: " + credits_Required);

  // console.log("isExtendedCredit: " + isExtendedCredit);
  // console.log("extendedCredit: " + extendedCredit);



  if (isExtendedCredit) {
    extendedCredit = true;
  }

  if (isExtendedCredit === null && extendedCredit === null) {
    extendedCredit = false;
  }

  // setIsECP(extendedCredit);

  if (!degree_Id) {
    degree_Id = degreeId;
  }



  // if (!credits_Required) {
  //   if (creditsRequired && String(creditsRequired).trim()) {
  //     credits_Required = creditsRequired;
  //   }
  //   else {
  //     credits_Required = 120;
  //   }
  // }

  // if (extendedCredit) {
  //   credits_Required += 30;
  // }

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
  const [exemptionCredits, setExemptionCredits] = useState(0);
  const [exemptionCourses, setExemptionCourses] = useState([]);
  const [exemptionCodes, setExemptionCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toggleCourseList = () => setShowCourseList((prev) => !prev);
  const toggleCourseDescription = () =>
    setShowCourseDescription((prev) => !prev);

  const [allCourses, setAllCourses] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Track if changes
  const [nextPath, setNextPath] = useState(null); // Track what new page should be
  const [showSaveModal, setShowSaveModal] = useState(false); // Popup for save
  const [showLeaveModal, setShowLeaveModal] = useState(false); // Popup for leave
  const [timelineName, setTimelineName] = useState('');
  const [tempName, setTempName] = useState('');
  const [tempDegId, setTempDegId] = useState(null);
  const [courseInstanceMap, setCourseInstanceMap] = useState({});
  const [uniqueIdCounter, setUniqueIdCounter] = useState(0);
  const [activeCourseCode, setActiveCourseCode] = useState(null);

  // TODO: This class contains a lot of lists that can be moved to a separate config file
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

  //load timeline from url
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const timelineStringParam = params.get('tstring');
    if (timelineStringParam) {
      const [decompressedTimeline, degreeFromUrl, creditsFromUrl, ecpFromUrl] = decompressTimeline(timelineStringParam);

      setTimelineString(timelineStringParam);
      setSemesterCourses(decompressedTimeline);
      if (decompressedTimeline.Exempted) {
        setExemptionCodes(decompressedTimeline.Exempted);
      }
      degree_Id = degreeFromUrl;
      setTempDegId(degreeFromUrl);
      startingSemester = Object.keys(decompressedTimeline)[1];
      credits_Required = creditsFromUrl;
      setCredsReq(creditsFromUrl);
      extendedCredit = ecpFromUrl;
    }
  }, [location.search]);

  useEffect(() => {
    const tempId = tempDegId || degree_Id;
    if (allCourses.length > 0 && tempId !== null && exemptionCodes.length > 0) {
      fetch(`/degree-reqs/${tempId}-requirements.txt`)
        .then(res => res.text())
        .then(data => {
          const courseListData = data.split('\n').map(s => s.trim().replaceAll(' ', ''));
          console.log(courseListData);
          for (const code of exemptionCodes) {
            if (courseListData.includes(code)) {
              console.log('added', code);
              addExemptionCourse(allCourses.find(course => course.code === code));
            }
          }
        });
    }
  }, [allCourses, tempDegId, degree_Id, exemptionCodes]);

  useEffect(() => {
    if (timelineData.length > 0) {
      setExemptionCodes(
        (timelineData.find((semester) => semester.term.toLowerCase() === 'exempted 2020') || {}).courses,
      );
    }
  }, [timelineData]);

  // Handle internal navigation (React)
  useBlocker(({ nextLocation }) => {
    if (hasUnsavedChanges) {
      setNextPath(nextLocation.pathname); // Store the intended destination
      setShowLeaveModal(true); // Show modal instead of navigating
      return true; // Block navigation
    }
    return false; // Allow navigation
  });

  // Handle external navigation
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = "You have unsaved changes. Are you sure you want to leave?"; // Custom message
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // NEW: Fetch all courses from /courses/getAllCourses
  useEffect(() => {
    const fetchAllCourses = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_SERVER}/courses/getAllCourses`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
        if (!response.ok) {
          throw new TimelineError('Failed to fetch all courses');
        }
        const data = await response.json();
        setAllCourses(data);
      } catch (err) {
        console.error('Error fetching all courses', err);
      }
    };

    fetchAllCourses();

    if (localStorage.getItem('Timeline_Name')) {
      if (
        localStorage.getItem('Timeline_Name') !== '' &&
        localStorage.getItem('Timeline_Name') !== 'null' &&
        localStorage.getItem('Timeline_Name') !== null
      ) {
        setTimelineName(localStorage.getItem('Timeline_Name'));
        setTempName(localStorage.getItem('Timeline_Name'));
      } else {
        setTimelineName('');
        setTempName('');
      }

      //console.log("Timeline Name Local Storage: ", localStorage.getItem("Timeline_Name"));
      //console.log("Timeline Name: ", timelineName);
    }
    setIsECP(extendedCredit);
  }, []);

  // NEW: Compute remaining courses not in the degree's course pools
  const normalizedDegreeCourseCodes = new Set(
    coursePools.flatMap((pool) =>
      pool.courses.map((course) => course.code.trim().toUpperCase()),
    ),
  );


  const remainingCourses = allCourses.filter(
    (course) =>
      !normalizedDegreeCourseCodes.has(course.code.trim().toUpperCase()),
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
  // TODO: Extract to a utility file - this function has no dependency
  // TODO: 12 should be constant: NUM_SEMESTERS_TO_GENERATE
  const generateFourYearSemesters = (startSem) => {
    const termOrder = ['Winter', 'Summer', 'Fall'];
    const parts = startSem.split(' ');
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
        const primaryResponse = await fetch(
          `${process.env.REACT_APP_SERVER}/courses/getByDegreeGrouped`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ degree: degree_Id }),
          },
        );
        if (!primaryResponse.ok) {
          const errorData = await primaryResponse.json();
          throw new TimelineError(
            errorData.error || `HTTP error! status: ${primaryResponse.status}`,
          );
        }
        const primaryData = await primaryResponse.json();

        let combinedData = primaryData;

        if (extendedCredit) {
          const extendedResponse = await fetch(
            `${process.env.REACT_APP_SERVER}/courses/getByDegreeGrouped`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ degree: 'ECP' }),
            },
          );
          if (!extendedResponse.ok) {
            const errorData = await extendedResponse.json();
            throw new TimelineError(
              errorData.error ||
              `HTTP error! status: ${extendedResponse.status}`,
            );
          }
          const extendedData = await extendedResponse.json();
          combinedData = primaryData.concat(extendedData);
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
  }, [degree_Id, location.state?.creditDeficiency, extendedCredit]);


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

    const timlineInfo = timelineData.length > 0
      ? timelineData
      : (Object.keys(semesterCourses).length > 0
        ? Object.entries(semesterCourses).map(([key, courses]) => {
          const [season, year] = key.split(' ');
          return {
            season,
            year: parseInt(year, 10),
            courses
          }
        })
        : null);

    // TODO: Use Array.reduce() or flatMap() for clearer data transformation
    if (timlineInfo) {
      timlineInfo.forEach((data) => {
        let isExempted = false;
        // Check the old format: data.term
        if (data.term && typeof data.term === 'string') {
          isExempted = data.term.trim().toLowerCase() === 'exempted 2020';
        }
        // Check the new format: data.season and data.year
        else if (data.season) {
          isExempted = data.season.trim().toLowerCase() === 'exempted';
        }

        // console.log(timelineData);

        if (data.term === "deficiencies 2020" && Array.isArray(data.courses)) {
          setDeficiencyCourses(() => {
            const newCourses = data.courses
              .map((courseCode) => {
                const genericCode = courseInstanceMap[courseCode] || courseCode;
                const course = allCourses.find((c) => c.code === genericCode);
                return course && course.code ? { code: course.code, credits: course.credits } : null;
              })
              .filter(Boolean); // Remove null values

            //Calculate total deficiency credits
            const totalDeficiencyCredits = newCourses.reduce(
              (sum, course) => sum + (course.credits || 3),
              0
            );

            setDeficiencyCredits(totalDeficiencyCredits);

            return [...newCourses]; // Append to existing list
          });

          data.term = "";
        }


        // if(data.term == "deficiencies 2020"){
        //   data.courses
        // .map((courseCode) => {
        //   const genericCode = courseInstanceMap[courseCode] || courseCode;
        //   const course = allCourses.find((c) => c.code === genericCode);
        //   return course && course.code ? { courseCode: course.code } : null;
        // })
        // .filter(Boolean);
        //   setDeficiencyCourses(prevCourses => {
        //     const newCourses = data.courses.filter(course => 
        //         !prevCourses.some(c => c.code === course) // Avoid duplicates
        //     ).map(course); // Assume 3 credits (modify as needed)

        //     return [...prevCourses, ...newCourses];
        //   });
        // }

        if (isExempted) {
          // Extract courses from the exempted item.
          if (data.course && typeof data.course === 'string') {
            parsedExemptedCourses.push(data.course.trim());
          } else if (Array.isArray(data.courses)) {
            data.courses.forEach((course) => {
              if (typeof course === 'string') {
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
        parsedExemptedCourses = ['MATH201', 'MATH206'];
      }
    }

    // Remove duplicates.
    parsedExemptedCourses = [...new Set(parsedExemptedCourses)];

    // --- Step 2. Build the semester map from non-exempted data ---
    const semesterMap = {};
    const semesterNames = new Set();

    nonExemptedData.forEach((data) => {
      let term = '';
      // Default courses to an empty array if not provided.
      let courses = Array.isArray(data.courses)
        ? data.courses
          .map((course) => (typeof course === 'string' ? course.trim() : ''))
          .filter(Boolean)
        : [];

      if (data.term && typeof data.term === 'string') {
        term = data.term;
        // For old format, also check for a single course.
        if (data.course && typeof data.course === 'string') {
          courses.push(data.course.trim());
        }
      } else if (data.season && data.year) {
        let formattedYear = data.year;
        term =
          data.season.trim().toLowerCase() === 'exempted'
            ? 'Exempted'
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
      const exemptedKey = 'Exempted';
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
      if (a.trim().toLowerCase() === 'exempted') return -1;
      if (b.trim().toLowerCase() === 'exempted') return 1;
      const order = { Winter: 1, "Fall/Winter": 2, Summer: 3, Fall: 4 };
      const [seasonA, yearA] = a.split(' ');
      const [seasonB, yearB] = b.split(' ');
      if (yearA !== yearB) {
        return parseInt(yearA, 10) - parseInt(yearB, 10);
      }
      return order[seasonA] - order[seasonB];
    });

    // --- Step 5. Update state ---
    setSemesters(
      sortedSemesters.map((term) => {
        const [season, year] = term.split(' ');

        let displayYear = year;
        if (season === 'Fall/Winter') {
          displayYear = `${year}-${(parseInt(year, 10) + 1) % 100}`;
        }
        return {
          id: term,
          name: `${season} ${displayYear}`,
        };
      }),
    );
    setSemesterCourses(() => {
      const newSemesterCourses = {};
      let newUniqueCounter = uniqueIdCounter; // start from current counter
      const newCourseInstanceMap = { ...courseInstanceMap };
      sortedSemesters.forEach((term) => {
        // Get the generic course codes from the semesterMap:
        const genericCodes = semesterMap[term] || [];
        // If duplicates exist, you can filter them out (each course should only appear once per semester)
        const uniqueGenericCodes = Array.from(new Set(genericCodes));
        newSemesterCourses[term] = uniqueGenericCodes.map((code) => {
          const uniqueId = `${code}-${newUniqueCounter}`;
          newUniqueCounter++;
          newCourseInstanceMap[uniqueId] = code;
          return uniqueId;
        });
      })
      setUniqueIdCounter(newUniqueCounter);
      setCourseInstanceMap(newCourseInstanceMap);
      return newSemesterCourses;
    });
    // console.log('Building semesterMap from timelineData:', timelineData);
    // console.log('Resulting semesterMap:', semesterMap);


  }, [timelineData, coursePools, extendedCredit, startingSemester]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 767);
      if (window.innerWidth > 999) {
        setAddButtonText('+ Add Semester');
      } else {
        setAddButtonText('+');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setShowCourseList(false);
      setShowCourseDescription(false);
    }
  }, [isDesktop]);

  const [shakingSemesterId, setShakingSemesterId] = useState(null);

  // ---------------- ADD / REMOVE Semesters ----------------
  // TODO: Extract to config file
  // BUG?: SEASON_ORDER uses Fall_Winter, but rest of code uses "Fall/Winter" 
  const SEASON_ORDER = {
    Winter: 1,
    Fall_Winter: 2,
    Summer: 3,
    Fall: 4,

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
    let formattedYear = selectedYear;
    let displayYear = selectedYear; // This will store YYYY-YY for name

    if (
      selectedSeason === 'Fall/Winter' &&
      !String(selectedYear).includes('-')
    ) {
      const startYear = parseInt(selectedYear, 10);
      displayYear = `${startYear}-${(startYear + 1) % 100}`;
    }

    const id = `${selectedSeason} ${selectedYear}`;
    const name = `${selectedSeason} ${displayYear}`;

    // Prevent duplicates
    if (semesters.some((sem) => sem.id === id)) {
      alert(`Semester ${name} is already added.`);
      return;
    }

    setHasUnsavedChanges(true);

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
      setHasUnsavedChanges(true);
      return updated;
    });
  };

  // ----------------------------------------------------------------------
  const isCourseAssigned = (courseCode) => {
    for (const semesterId in semesterCourses) {
      // Skip the "courseList" container
      if (semesterId === 'courseList') continue;

      // For each instanceId, retrieve its base code from courseInstanceMap
      const alreadyAssigned = semesterCourses[semesterId].some((instanceId) => {
        const baseCode = courseInstanceMap[instanceId] || instanceId;
        return baseCode === courseCode;
      });

      if (alreadyAssigned) {
        // console.log('Course already assigned:', courseCode);
        return true;
      }
    }
    return false;
  };

  // Returns true if the course’s offeredIn data (array or string)
  // includes the semester term (e.g. "Fall", "Winter", "Summer") – case-insensitive.
  const isCourseOfferedInSemester = (course, semesterId) => {
    // Extract the term from the semesterId (assumes format like "Fall 2025")
    const semesterTerm = semesterId.split(" ")[0].toLowerCase();

    if (Array.isArray(course.offeredIn) && course.offeredIn.length > 0) {
      // Normalize terms to lowercase before checking.
      const offeredTerms = course.offeredIn.map(term => term.toLowerCase());
      return offeredTerms.includes(semesterTerm);
    }

    if (typeof course.offeredIn === "string" && course.offeredIn.trim() !== "") {
      // If offeredIn is a comma-separated string.
      const offeredTerms = course.offeredIn.split(",").map(term => term.trim().toLowerCase());
      return offeredTerms.includes(semesterTerm);
    }

    // If there is no offering information, we assume the course is not offered in any term.
    return false;
  };



  const handleDragStart = (event) => {
    setReturning(false);
    const internalId = String(event.active.id);
    const courseCode = event.active.data.current.courseCode;
    setActiveCourseCode(courseCode); // Store it in state
    const course = allCourses.find((c) => c.code === courseCode) || deficiencyCourses.find((c) => c.code === courseCode);;
    if (course) {
      setSelectedCourse(course);
    }
    setActiveId(internalId);
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

  // TODO: Extract into smaller functions:
  // - determineDropTarget(over) -> returns {semesterId, index}
  // - validateCoursePlacement(course, semesterId) -> returns {valid, reason}
  // - updateCoursesInSemester(semesterId, courses) -> handles state update
  // - checkAndWarnCreditLimit(semesterId) -> validates credit constraints
  const handleDragEnd = (event) => {
    const { active, over } = event;
    const uniqueId = String(active.id); // courseCode
    const sourceContainer = active.data.current.containerId;
    let draggedId = uniqueId; // initially, this is the generic course code if from courseList
    const draggedGeneric = active.data.current.courseCode;

    // Check if course is from deficiency list
    const isFromDeficiencyList = sourceContainer === "deficiencyList";

    // If dragged from the course list, generate a new unique instance ID
    // BUG?: The logic mixes instance ID generation with existing ID handling
    if (sourceContainer === 'courseList' || isFromDeficiencyList) {
      const newUniqueId = `${draggedGeneric}-${uniqueIdCounter}`;
      setUniqueIdCounter((prev) => prev + 1);
      // Update the mapping so that the unique id points to the generic course code
      setCourseInstanceMap((prev) => ({
        ...prev,
        [newUniqueId]: active.data.current.courseCode,
      }));

      draggedId = newUniqueId;
    }

    if (!over) {
      setActiveId(null);
      document.querySelector('.semesters')?.classList.remove('no-scroll');
      return;
    }


    setSemesterCourses((prevSemesters) => {
      setHasUnsavedChanges(true);
      const updatedSemesters = { ...prevSemesters };
      let overSemesterId, overIndex;

      // TODO: Refactor to reduce duplication using a helper function
      if (over.data.current?.type === 'semester') {
        overSemesterId = over.data.current.containerId;
        // Ensure the target semester exists.
        if (!updatedSemesters[overSemesterId]) {
          updatedSemesters[overSemesterId] = [];
        }
        const targetCourses = updatedSemesters[overSemesterId];
        const exists = targetCourses.some(
          (code) => (courseInstanceMap[code] || code) === draggedGeneric
        );
        if (exists) return prevSemesters;
        overIndex = targetCourses.length;
      } else if (over.data.current?.type === 'course') {
        overSemesterId = over.data.current.containerId;
        if (!updatedSemesters[overSemesterId]) {
          updatedSemesters[overSemesterId] = [];
        }
        const targetCourses = updatedSemesters[overSemesterId];
        const exists = targetCourses.some(
          (code) => (courseInstanceMap[code] || code) === draggedGeneric
        );
        if (exists) return prevSemesters;
        overIndex = targetCourses.indexOf(over.id);
        if (draggedId === over.id) return prevSemesters; // Dropped onto itself
      } else {
        overSemesterId = findSemesterIdByCourseCode(over.id, updatedSemesters);
        if (!overSemesterId) return prevSemesters;
        if (!updatedSemesters[overSemesterId]) {
          updatedSemesters[overSemesterId] = [];
        }
        const targetCourses = updatedSemesters[overSemesterId];
        const exists = targetCourses.some(
          (code) => (courseInstanceMap[code] || code) === draggedGeneric
        );
        if (exists) return prevSemesters;
        overIndex = targetCourses.indexOf(over.id);
      }

      // Remove the dragged course from its current semester (if present)
      const activeSemesterId = findSemesterIdByCourseCode(draggedId, updatedSemesters);
      if (activeSemesterId) {
        updatedSemesters[activeSemesterId] = updatedSemesters[activeSemesterId].filter(
          (code) => code !== draggedId
        );
      }

      // Ensure the target semester exists before inserting.
      if (overSemesterId && !updatedSemesters[overSemesterId]) {
        updatedSemesters[overSemesterId] = [];
      }

      if (overSemesterId) {
        updatedSemesters[overSemesterId].splice(overIndex, 0, draggedId);
      }

      // Check if we exceed the limit
      // TODO: Credit limit checking is mixed into drag-drop logic
      // Refactor to validateAndWarnCreditLimit(semesterId, courses)
      const overSemesterObj = semesters.find(
        (s) => s.id === overSemesterId,
      );
      if (!overSemesterObj) return prevSemesters; // safety check

      // Sum up the credits in the new semester
      const thisSemesterCourses = updatedSemesters[overSemesterId];
      let sumCredits = 0;
      for (let cCode of thisSemesterCourses) {
        const genericCode = courseInstanceMap[cCode] || cCode;
        const course = allCourses.find((c) => c.code === genericCode);

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


    setActiveId(null);
    document.querySelector('.semesters')?.classList.remove('no-scroll');
  };

  const handleDragCancel = () => {
    setActiveId(null);
    document.querySelector('.semesters')?.classList.remove('no-scroll');
  };

  const handleReturn = (courseCode) => {
    setReturning(true);
    setHasUnsavedChanges(true);

    // TODO: This filters ALL semesters on every course removal
    // For timelines with many semesters, this is inefficient (O(n*m))
    // Consider maintaining a reverse lookup: Map<courseInstanceId, semesterId>
    setSemesterCourses((prevSemesters) => {
      const updatedSemesters = { ...prevSemesters };
      for (const semesterId in updatedSemesters) {
        updatedSemesters[semesterId] = updatedSemesters[semesterId].filter(
          (code) => code !== courseCode,
        );
      }
      return updatedSemesters;
    });
  };

  const handleCourseSelect = (code) => {
    let genericCode = code;
    if (code.startsWith("source-")) {
      genericCode = code.replace("source-", "");
    } else {
      genericCode = courseInstanceMap[code] || code;
    }
    const course = allCourses.find((c) => c.code === genericCode);
    if (course) {
      setSelectedCourse(course);
    }
  };


  // TODO: Move to constants file
  const ECP_EXTRA_CREDITS = 30; // Extra credits for ECP students

  // TODO: This useEffect is 200+ lines and is highly inefficient:
  // 1. Parses exempted vs regular courses
  // 2. Builds semester map from timeline data
  // 3. Generates missing empty semesters
  // 4. Sorts all semesters
  // 5. Updates multiple state variables
  // TODO: Break into smaller functions: parseExemptions(), buildSemesterMap(), etc.
  // Or extract to custom hook: useTimelineDataProcessor()
  useEffect(() => {
    const calculateTotalCredits = () => {
      let unmetPrereqFound = false;
      const poolCreditMap = {};

      // Log coursePools to debug
      // console.log('Course Pools:', coursePools);

      // Initialize each pool with a max credits limit
      coursePools
        .filter((pool) => !pool.poolName.toLowerCase().includes("option"))
        .forEach((pool) => {
          poolCreditMap[pool.poolId] = {
            assigned: 0,
            max: parseMaxCreditsFromPoolName(pool.poolName),
          };
          // console.log(`Initialized pool ${pool.poolId}: max = ${parseMaxCreditsFromPoolName(pool.poolName)}`);
        });

      // Initialize 'remaining' pool
      if (!poolCreditMap['remaining']) {
        poolCreditMap['remaining'] = { assigned: 0, max: Infinity };
        // console.log("Initialized 'remaining' pool: max = Infinity");
      }

      for (const semesterId in semesterCourses) {
        if (semesterId.toLowerCase() === 'exempted') continue;
        const courseCodes = semesterCourses[semesterId];
        const currentSemesterIndex = semesters.findIndex((s) => s.id === semesterId);
        // console.log(`Processing semester: ${semesterId} (index ${currentSemesterIndex})`);

        courseCodes.forEach((instanceId) => {
          const genericCode = courseInstanceMap[instanceId] || instanceId;
          const pool = coursePools.find((p) =>
            p.courses.some((c) => c.code === genericCode)
          ) || { poolId: 'remaining', courses: remainingCourses };

          const course = pool.courses.find((c) => c.code === genericCode) || allCourses.find((c) => c.code === genericCode);
          if (!course) {
            console.warn(`Course ${genericCode} not found`);
            return;
          }

          const credits = course.credits !== undefined ? course.credits : 3;
          // console.log(`Course ${genericCode}: credits = ${credits}`);

          const prerequisitesMet = arePrerequisitesMet(genericCode, currentSemesterIndex);
          if (!prerequisitesMet) unmetPrereqFound = true;

          // Dynamically add the pool if it doesn't exist
          if (!poolCreditMap[pool.poolId]) {
            poolCreditMap[pool.poolId] = { assigned: 0, max: Infinity };
            // console.log(`Dynamically added pool ${pool.poolId} with max = Infinity`);
          }

          const poolData = poolCreditMap[pool.poolId];
          poolData.assigned = Math.min(poolData.max, poolData.assigned + credits);
          // console.log(`Pool ${pool.poolId}: assigned ${credits}, total now ${poolData.assigned} (max ${poolData.max})`);
        });
      }

      const total = Object.values(poolCreditMap).reduce(
        (sum, poolData) => sum + poolData.assigned,
        0
      );
      // console.log('Final Pool Credit Map:', poolCreditMap);
      // console.log('Calculated Total Credits:', total);

      setTotalCredits(total);
      setHasUnmetPrerequisites(unmetPrereqFound);
    };

    calculateTotalCredits();
  }, [semesterCourses, semesters, coursePools, remainingCourses, courseInstanceMap, allCourses]);

  const addDeficiencyCourse = (course) => {
    setDeficiencyCourses((prev) => {
      if (prev.some((c) => c.code === course.code)) {
        alert("Course already added to deficiencies!");
        return prev;
      }
      alert("Course added to deficiencies!");
      setDeficiencyCredits((prevCredits) => prevCredits + (course.credits || 0));
      return [...prev, course];
    });
  };

  const removeDeficiencyCourse = (course) => {
    setDeficiencyCourses((prev) => prev.filter((c) => c.code !== course.code));
    setDeficiencyCredits((prev) => prev - (course.credits || 0));
  };


  const addExemptionCourse = (course) => {
    setExemptionCourses((prev) => {
      if (prev.some((c) => c.code === course.code)) {
        alert("Course already added to exemptions!");
        return prev;
      }
      // alert("Course added to exemptions!");
      setExemptionCredits((prevCredits) => prevCredits + (course.credits || 0));
      return [...prev, course];
    });
  };

  const removeExemptionCourse = (course) => {
    setExemptionCourses((prev) => prev.filter((c) => c.code !== course.code));
    setExemptionCredits((prev) => prev - (course.credits || 0));
  };


  // Function to check if prerequisites and corequisites are met
  // TODO: This function has complex nested logic for checking prerequisites and corequisites
  // Should be split into:
  // - checkPrerequisites(course, completedCourses) 
  // - checkCorequisites(course, availableCourses)
  // - checkGroupedRequisites(requisites, availableCourses)
  const arePrerequisitesMet = (courseCode, currentSemesterIndex) => {
    const genericCode = courseInstanceMap[courseCode] || courseCode;
    const course = allCourses.find((c) => c.code === genericCode);

    if (!course || !course.requisites || course.requisites.length === 0) {
      return true;
    }

    // Separate prerequisites and corequisites
    const prerequisites = course.requisites.filter(
      (r) => r.type.toLowerCase() === 'pre'
    );
    const corequisites = course.requisites.filter(
      (r) => r.type.toLowerCase() === 'co'
    );

    // Collect courses from all previous semesters
    const completedCourses = [];
    for (let i = 0; i < currentSemesterIndex; i++) {
      const semesterId = semesters[i]?.id;
      const coursesInSemester = semesterCourses[semesterId] || [];
      coursesInSemester.forEach((instanceId) => {
        const generic = courseInstanceMap[instanceId] || instanceId;
        completedCourses.push(generic);
      });
    }

    // Check prerequisites against completed courses only
    const prereqMet = prerequisites.every((prereq) => {
      if (prereq.group_id) {
        // For grouped prerequisites, at least one in the group must be completed.
        const group = prerequisites.filter(
          (p) => p.group_id === prereq.group_id
        );
        return group.some((p) => completedCourses.includes(p.code2));
      } else {
        return completedCourses.includes(prereq.code2);
      }
    });

    // For corequisites, check courses from previous semesters and current semester
    const currentSemesterId = semesters[currentSemesterIndex]?.id;
    const currentCourses = (semesterCourses[currentSemesterId] || []).map(
      (instanceId) => courseInstanceMap[instanceId] || instanceId
    );
    const availableCourses = [...completedCourses, ...currentCourses];

    const coreqMet = corequisites.every((coreq) => {
      if (coreq.group_id) {
        const group = corequisites.filter((c) => c.group_id === coreq.group_id);
        return group.some((c) => availableCourses.includes(c.code2));
      } else {
        return availableCourses.includes(coreq.code2);
      }
    });

    return prereqMet && coreqMet;
  };


  // The Gina Cody School of Engineering and Computer Science at Concordia University has the following credit limits for full-time students:
  // limit is 14 summer; Fall Winter 15.
  function getMaxCreditsForSemesterName(semesterName) {
    if (semesterName.toLowerCase().includes('summer')) {
      return 15;
    }
    return 19;
  }

  function parseMaxCreditsFromPoolName(poolName) {
    // Regex to find e.g. "(47.5 credits)"
    const match = poolName.match(/\(([\d.]+)\s*credits?\)/i);
    if (match) {
      return parseFloat(match[1]); // 47.5
    }
    return Infinity; // fallback if we can't parse a number
  }

  //   // Optionally log the data for debugging purposes
  //   //console.log('Saved Timeline:', timelineData);
  // };
  const confirmSaveTimeline = async (tName) => {
    // Ensure required values are provided
    if (!tName.trim()) {
      alert('Timeline name is required!');
      return;
    }
    if (!user || !user.id) {
      alert('User must be logged in!');
      navigate('/signin');
      return;
    }
    if (!degree_Id) {
      alert('Degree ID is missing!');
      return;
    }

    setTimelineName(tName);

    // Build final timeline data from all semesters.
    const finalTimelineData = [];
    const exempted_courses = [];

    semesters.forEach((semester) => {
      const [season, year = '2020'] = semester.name.split(' ');

      if (
        semester.id.trim().toLowerCase() === 'exempted' ||
        semester.id.trim().toLowerCase() === 'transfered courses'
      ) {
        (semesterCourses[semester.id] || []).forEach((courseCode) => {
          const genericCode = courseInstanceMap[courseCode] || courseCode;
          const course = allCourses.find((c) => c.code === genericCode);
          if (course && course.code) {
            exempted_courses.push(course.code);
          } else {
            console.warn(`Course not found or missing code for: ${courseCode}`);
          }
        });
      }

      const coursesForSemester = (semesterCourses[semester.id] || [])
        .map((courseCode) => {
          const genericCode = courseInstanceMap[courseCode] || courseCode;
          const course = allCourses.find((c) => c.code === genericCode);
          return course && course.code ? { courseCode: course.code } : null;
        })
        .filter(Boolean);

      const yearInt = isNaN(parseInt(year, 10)) ? 2020 : parseInt(year, 10);
      finalTimelineData.push({ season, year: yearInt, courses: coursesForSemester });
    });

    const deficiencyCoursescode = deficiencyCourses
      .map((courseCode) => {
        const genericCode = courseInstanceMap[courseCode.code] || courseCode.code;
        const course = allCourses.find((c) => c.code === genericCode);
        return course && course.code ? { courseCode: course.code } : null;
      })
      .filter(Boolean);
    // console.log(deficiencyCoursescode);
    if (deficiencyCourses.length > 0) {
      finalTimelineData.push({
        season: 'deficiencies',
        year: 2020,
        courses: deficiencyCoursescode,
      });
    }

    if (finalTimelineData.length === 0 && exempted_courses.length === 0) {
      alert('No valid data to save.');
      setHasUnsavedChanges(false);
      return;
    }

    // Build the payload for the timeline.
    const userTimeline = [
      {
        user_id: user.id,
        name: tName,
        items: finalTimelineData.map((item) => ({
          season: item.season,
          year: item.year,
          courses: item.courses.map((course) => course.courseCode),
        })),
        isExtendedCredit: extendedCredit || false,
      },
    ];

    // Debug: log the payload
    // console.log('Saving timeline with payload:', {
    //   user_id: user.id,
    //   name: tName,
    //   items: userTimeline[0].items,
    //   degree_id: degree_Id,
    //   isExtendedCredit: extendedCredit || false,
    // });

    const user_id = userTimeline[0].user_id;
    const timelineNameToSend = userTimeline[0].name;
    const items = userTimeline[0].items;
    const isExtended = userTimeline[0].isExtendedCredit;
    const degreeId = degree_Id;

    // Save Exempted Courses (if needed)
    // TODO: Two separate try-catch blocks for exemptions and timeline saves
    // Consider using Promise.all() to save both simultaneously
    // Or combine into single transaction with better error recovery
    try {
      const responseExemptions = await fetch(
        `${process.env.REACT_APP_SERVER}/exemption/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coursecodes: exempted_courses, user_id }),
        }
      );
      const dataExemptions = await responseExemptions.json();
      if (!responseExemptions.ok) {
        alert('Error saving Exempted Courses: ' + (dataExemptions.message || ''));
      }
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error saving Exempted Courses:', error);
      alert('An error occurred while saving your timeline.');
    }

    // Save the complete timeline.
    try {
      const responseTimeline = await fetch(
        `${process.env.REACT_APP_SERVER}/timeline/save`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timeline: {
              user_id,
              name: timelineNameToSend,
              items,
              degree_id: degree_Id,
              isExtendedCredit: isExtended,
            },
          }),
        }
      );
      const dataTimeline = await responseTimeline.json();
      if (responseTimeline.ok) {
        alert('Timeline saved successfully!');
        setHasUnsavedChanges(false);
        setShowSaveModal(false);
        setTimeout(() => {
          navigate('/user');
        }, 250);
      } else {
        alert('Error saving Timeline: ' + (dataTimeline.message || ''));
      }
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error saving timeline:', error);
      alert('An error occurred while saving your timeline.');
    }
  };


  // Function to handle mouse move over the scrollable container
  // const handleScrollMouseMove = (e) => {
  //   const wrapper = scrollWrapperRef.current;
  //   if (!wrapper) return;
  //
  //   const rect = wrapper.getBoundingClientRect();
  //   // Calculate x position relative to the container
  //   const mouseX = e.clientX - rect.left;
  //   const threshold = 50;
  //   let direction = 0;
  //
  //   if (mouseX < threshold) {
  //     direction = -1;
  //   } else if (mouseX > rect.width - threshold) {
  //     direction = 1;
  //   } else {
  //     direction = 0;
  //   }
  //
  //   if (direction !== 0) {
  //     wrapper.classList.add('scrolling');
  //     if (!autoScrollInterval.current) {
  //       autoScrollInterval.current = setInterval(() => {
  //         // Adjust the speed
  //         wrapper.scrollLeft += direction * 15;
  //       }, 30);
  //     }
  //   } else {
  //     // Remove the visual cue and stop scrolling if mouse is not in the edge zone
  //     wrapper.classList.remove('scrolling');
  //     if (autoScrollInterval.current) {
  //       clearInterval(autoScrollInterval.current);
  //       autoScrollInterval.current = null;
  //     }
  //   }
  // };

  // const handleScrollMouseLeave = () => {
  //   const wrapper = scrollWrapperRef.current;
  //   if (!wrapper) return;
  //   wrapper.classList.remove('scrolling');
  //   if (autoScrollInterval.current) {
  //     clearInterval(autoScrollInterval.current);
  //     autoScrollInterval.current = null;
  //   }
  // };

  const exportTimelineToPDF = () => {
    const input = document.querySelector('.timeline-middle-section');
    const scrollWrapper = document.querySelector('.timeline-scroll-wrapper');
    const addSemesterButton = document.querySelector('.add-semester-button');
    const deleteButtons = input.querySelectorAll('.remove-semester-btn, .remove-course-btn');

    if (!input || !scrollWrapper) {
      alert('Timeline section not found');
      return;
    }

    // Backup original styles
    const originalHeight = input.style.height;
    const originalOverflow = input.style.overflow;
    const originalScrollHeight = scrollWrapper.style.height;
    const originalWrapperOverflow = scrollWrapper.style.overflow;
    const originalButtonDisplay = addSemesterButton?.style.display;

    // Hide the add semester button
    if (addSemesterButton) {
      addSemesterButton.style.display = 'none';
    }

    // Hide delete buttons in semesters
    deleteButtons.forEach((btn) => {
      btn.style.display = 'none';
    });

    // Temporarily force full height for PDF capture
    const originalScrollLeft = scrollWrapper.scrollLeft;
    const originalScrollTop = scrollWrapper.scrollTop;

    input.style.height = 'auto';
    input.style.overflow = 'visible';
    scrollWrapper.style.height = 'auto';
    scrollWrapper.style.overflow = 'visible';

    // Expand the wrapper to full scrollable width & height
    const fullWidth = scrollWrapper.scrollWidth;
    const fullHeight = scrollWrapper.scrollHeight;

    html2canvas(scrollWrapper, {
      scale: 2,
      useCORS: true,
      width: fullWidth,
      height: fullHeight,
      windowWidth: fullWidth,
      windowHeight: fullHeight,
    })
      .then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = canvas.width;
        const pdfHeight = canvas.height;

        const pdf = new jsPDF('l', 'px', [pdfWidth, pdfHeight]);
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('timeline.pdf');
      })
      .catch(error => {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF.');
      })
      .finally(() => {
        // Restore original styles
        input.style.height = originalHeight;
        input.style.overflow = originalOverflow;
        scrollWrapper.style.height = originalScrollHeight;
        scrollWrapper.style.overflow = originalWrapperOverflow;
        scrollWrapper.scrollLeft = originalScrollLeft;
        scrollWrapper.scrollTop = originalScrollTop;

        if (addSemesterButton) addSemesterButton.style.display = originalButtonDisplay;
        deleteButtons.forEach(btn => (btn.style.display = ''));
      });
  }

  // Compute the first occurrence for each course in the timeline (ignoring exempted semesters)
  const firstOccurrence = {};
  semesters.forEach((sem, index) => {
    if (sem.id.toLowerCase() === 'exempted') return;
    const courseInstances = semesterCourses[sem.id] || [];
    courseInstances.forEach((instanceId) => {
      const genericCode = courseInstanceMap[instanceId] || instanceId;
      // Only set it once, for the first occurrence
      if (firstOccurrence[genericCode] === undefined) {
        firstOccurrence[genericCode] = index;
      }
    });
  });


  useEffect(() => {
    const calculatedCreditsRequired = () => {
      let totalCredits = 0;
      coursePools.forEach((pool) => {
        const maxCredits = parseMaxCreditsFromPoolName(pool.poolName, pool.courses);
        totalCredits += maxCredits;
        if (totalCredits > 120) {
          totalCredits = 120; // Cap at 120 credits
        }
      });
      return totalCredits;
    };
    let creds = calculatedCreditsRequired();


    if (extendedCredit) {
      creds += ECP_EXTRA_CREDITS;
    }


    setCredsReq(creds);
  }, [coursePools]);




  useEffect(() => {

    if (Object.keys(semesterCourses).length <= 1) {
      return;
    }
    const newTimelineString = compressTimeline(semesterCourses, degreeId, credits_Required, extendedCredit);
    if (timelineString === null) {
      setTimelineString(newTimelineString);
      return;
    }
    if (timelineString === newTimelineString) {
      return;
    }
    setHistory([...history, timelineString]);
    setFuture([]);
    setTimelineString(newTimelineString);
  }, [semesterCourses]);



  const handleUndo = () => {
    if (history.length > 0) {
      const prevStr = history[history.length - 1];
      setTimelineString(prevStr);
      setFuture((prev) => [timelineString, ...prev]);
      setHistory((prev) => prev.slice(0, -1));
      const [decompressedTimeline, , ,] = decompressTimeline(prevStr);
      setSemesterCourses(decompressedTimeline);
    }
  }

  const handleRedo = () => {
    if (future.length > 0) {
      const nextStr = future[0];
      setTimelineString(nextStr);
      setHistory((prev) => [...prev, timelineString]);
      setFuture((prev) => prev.slice(1));
      const [decompressedTimeline,] = decompressTimeline(nextStr);
      setSemesterCourses(decompressedTimeline);
    }
  }

  const toggleShareDialog = () => {
    setIsShareVisible(!isShareVisible);
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${REACT_APP_CLIENT}/timeline_change?tstring=${compressTimeline(semesterCourses, degree_Id, credsReq, extendedCredit)}`)
      .catch(() => alert("Something went wrong"));
    toggleShareDialog();
  }


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
                <div className="timeline-buttons-container">
                  <Button
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    className="icon-btn"
                  >
                    <FaUndo size={25} />
                  </Button>
                  <Button
                    onClick={handleRedo}
                    disabled={future.length === 0}
                    className="icon-btn"
                  >
                    <FaRedo size={25} />
                  </Button>
                  <button
                    className='download-timeline-button'
                    onClick={toggleShareDialog}
                  >
                    <FaShareSquare />
                    <span className="button-text">Share</span>
                  </button>
                  <button className="download-timeline-button" onClick={exportTimelineToPDF}>
                    <img src={downloadIcon} alt="Download" className="button-icon download-icon" />
                    <span className="button-text">Download</span>
                  </button>
                </div>
                <h4>
                  Total Credits Earned: {totalCredits + deficiencyCredits} /{' '}{credsReq + deficiencyCredits - exemptionCredits}
                </h4>
                <div className="timeline-buttons-container">
                  <div>
                    {coursePools != null &&
                      semesterCourses != null &&
                      totalCredits != null &&
                      deficiencyCredits != null ? (
                      <ShowInsights
                        coursePools={coursePools}
                        semesterCourses={semesterCourses}
                        totalCredits={totalCredits}
                        deficiencyCredits={deficiencyCredits}
                        courseInstanceMap={courseInstanceMap}
                      />
                    ) : (
                      <div>
                        <p>Loading insights data... Please ensure all required data is available.</p>
                      </div>
                    )}
                  </div>
                  <button
                    className="add-deficiencies-button"
                    onClick={() => setShowDeficiencyModal(true)}
                  >
                    Add Deficiencies
                  </button>
                  <button
                    className="add-deficiencies-button"
                    onClick={() => setShowExemptionsModal(true)}
                  >
                    Add Exemptions
                  </button>
                  <button
                    className="save-timeline-button"
                    onClick={() =>
                      timelineName
                        ? confirmSaveTimeline(timelineName)
                        : setShowSaveModal(true)
                    }
                  >
                    <img src={saveIcon} alt="Save" className="button-icon save-icon" />
                    <span className="button-text">Save Timeline</span>
                  </button>
                </div>
              </div>

              <div className="timeline-page">
                <Droppable
                  className="courses-with-button"
                  id="courses-with-button"
                >
                  <div
                    className={`timeline-left-bar ${showCourseList ? '' : 'hidden'}`}
                  >
                    {showCourseList && (
                      <div>
                        <h4 className='mt-1'>Course List</h4>
                        {/* Search input field */}
                        <input
                          type="text"
                          placeholder="Search courses..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="course-search-input"
                        />

                        <div className="course-list-container-timeline">
                          <Droppable
                            id="courseList"
                            className="course-list"
                            style={{ color: 'red' }}
                          >
                            <Accordion>
                              {coursePools.map((coursePool) => {
                                // Determine if any course in this pool matches the search query.
                                const poolMatches =
                                  searchQuery.trim() === '' ||
                                  coursePool.courses.some((course) =>
                                    course.code
                                      .toLowerCase()
                                      .includes(searchQuery.toLowerCase()),
                                  );
                                return (
                                  <Accordion.Item
                                    eventKey={coursePool.poolName}
                                    key={coursePool.poolId}
                                    className={
                                      searchQuery.trim() !== '' && !poolMatches
                                        ? 'hidden-accordion'
                                        : ''
                                    }
                                  >
                                    <Accordion.Header>
                                      {coursePool.poolName}
                                    </Accordion.Header>
                                    <Accordion.Body>
                                      <Container>
                                        {coursePool.courses.map((course) => {
                                          const courseMatches =
                                            searchQuery.trim() === '' ||
                                            course.code
                                              .toLowerCase()
                                              .includes(
                                                searchQuery.toLowerCase(),
                                              );
                                          return (
                                            <DraggableCourse
                                              key={`source-${coursePool.poolId}-${course.code}`
                                              }
                                              internalId={`source-${coursePool.poolId}-${course.code}`
                                              }
                                              courseCode={course.code}
                                              title={course.code}
                                              disabled={false}
                                              isReturning={returning}
                                              isSelected={
                                                selectedCourse?.code ===
                                                course.code
                                              }
                                              onSelect={handleCourseSelect}
                                              containerId="courseList"
                                              isInTimeline={isCourseAssigned(course.code)}
                                              className={
                                                !courseMatches
                                                  ? 'hidden-course'
                                                  : ''
                                              }
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
                                  searchQuery.trim() !== '' &&
                                    !remainingCourses.some((course) =>
                                      course.code
                                        .toLowerCase()
                                        .includes(searchQuery.toLowerCase()),
                                    )
                                    ? 'hidden-accordion'
                                    : ''
                                }
                              >
                                <Accordion.Header>
                                  Remaining Courses
                                </Accordion.Header>
                                <Accordion.Body>
                                  <Container>
                                    {remainingCourses.map((course) => {
                                      const courseMatches =
                                        searchQuery.trim() === '' ||
                                        course.code
                                          .toLowerCase()
                                          .includes(searchQuery.toLowerCase());
                                      return (
                                        <DraggableCourse
                                          key={`source-remaining-${course.code}`
                                          }
                                          internalId={`source-remaining-${course.code}`
                                          }
                                          courseCode={course.code}
                                          title={course.code}
                                          disabled={false}
                                          isReturning={returning}
                                          isSelected={selectedCourse?.code === course.code}
                                          onSelect={handleCourseSelect}
                                          containerId="courseList"
                                          isInTimeline={isCourseAssigned(course.code)}
                                          className={!courseMatches ? 'hidden-course' : ''}
                                        />

                                      );
                                    })}
                                  </Container>
                                </Accordion.Body>
                              </Accordion.Item>
                              {deficiencyCredits !== 0 &&
                                <Accordion.Item eventKey="deficiencies">
                                  <Accordion.Header>Deficiency Courses</Accordion.Header>
                                  <Accordion.Body>
                                    <Container>
                                      {deficiencyCourses.map((course) => {
                                        const isSelected = selectedCourse?.code === course.code;
                                        return (
                                          <div key={`source-deficiency-${course.code}`}>
                                            <DraggableCourse
                                              internalId={`source-deficiency-${course.code}`}
                                              courseCode={course.code}
                                              title={course.code}
                                              disabled={isCourseAssigned(course.code)}
                                              isReturning={returning}
                                              isSelected={isSelected}
                                              onSelect={handleCourseSelect}
                                              containerId="deficiencyList"
                                              isInTimeline={isCourseAssigned(course.code)}
                                              removeButton={
                                                <button
                                                  className={`remove-course-btn ${isSelected ? 'selected' : ''}`}
                                                  onClick={() => removeDeficiencyCourse(course)}
                                                >
                                                  <svg
                                                    width="25"
                                                    height="20"
                                                    viewBox="0 0 30 24"
                                                    fill="red"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                  >
                                                    {isSelected ? (
                                                      <rect x="2" y="11" width="22" height="4" fill="#912338" />
                                                    ) : (
                                                      <rect x="2" y="11" width="22" height="4" fill="white" />
                                                    )}
                                                  </svg>
                                                </button>
                                              }
                                            />
                                          </div>
                                        );
                                      })}

                                    </Container>
                                  </Accordion.Body>
                                </Accordion.Item>
                              }
                              {exemptionCredits !== 0 &&
                                <Accordion.Item eventKey="deficiencies">
                                  <Accordion.Header>Exempted Courses</Accordion.Header>
                                  <Accordion.Body>
                                    <Container>
                                      {exemptionCourses.map((course) => {
                                        const isSelected = selectedCourse?.code === course.code;
                                        return (
                                          <div key={`source-exemption-${course.code}`}>
                                            <DraggableCourse
                                              internalId={`source-exemption-${course.code}`}
                                              courseCode={course.code}
                                              title={course.code}
                                              disabled={isCourseAssigned(course.code)}
                                              isReturning={returning}
                                              isSelected={isSelected}
                                              onSelect={handleCourseSelect}
                                              containerId="exemptionList"
                                              isInTimeline={isCourseAssigned(course.code)}
                                              removeButton={
                                                <button
                                                  className={`remove-course-btn ${isSelected ? 'selected' : ''}`}
                                                  onClick={() => removeExemptionCourse(course)}
                                                >
                                                  <svg
                                                    width="25"
                                                    height="20"
                                                    viewBox="0 0 30 24"
                                                    fill="red"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                  >
                                                    {isSelected ? (
                                                      <rect x="2" y="11" width="22" height="4" fill="#912338" />
                                                    ) : (
                                                      <rect x="2" y="11" width="22" height="4" fill="white" />
                                                    )}
                                                  </svg>
                                                </button>
                                              }
                                            />
                                          </div>
                                        );
                                      })}

                                    </Container>
                                  </Accordion.Body>
                                </Accordion.Item>
                              }
                            </Accordion>
                          </Droppable>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    className="left-toggle-button"
                    onClick={toggleCourseList}
                  >
                    {showCourseList ? '◀' : '▶'}
                  </button>
                </Droppable>

                <div className="timeline-middle-section">
                  <div className="timeline-header">
                    <div className="timeline-title">
                      {timelineName && timelineName !== 'null' ? (
                        <h2>{timelineName}</h2>
                      ) : (
                        <h2>My Timeline</h2>
                      )}
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
                    // onMouseMove={handleScrollMouseMove}
                    // onMouseLeave={handleScrollMouseLeave}
                    onWheel={(e) => {
                      e.preventDefault();
                      e.currentTarget.scrollLeft += e.deltaY;
                    }}
                  >
                    <div className="semesters">
                      {Object.keys(semesterCourses).map((semesterName, index) => {
                        // 1) Calculate total credits for this semester
                        const isExempted = semesterName
                          .trim()
                          .toLowerCase()
                          .startsWith('exempted');

                        const currentSemesterIndex = semesters.findIndex((s) => s.id === semesterName);
                        const sumCredits = (semesterCourses[semesterName] || [])
                          .map((instanceId) => {
                            // Look for the course in both coursePools and remainingCourses
                            const genericCode = courseInstanceMap[instanceId] || instanceId;
                            // Only count this course if this semester is the first occurrence.
                            if (currentSemesterIndex !== firstOccurrence[genericCode]) {
                              return 0;
                            }
                            const courseInPool = coursePools
                              .flatMap((pool) => pool.courses)
                              .find((c) => c.code === genericCode);

                            // If course is not in coursePools, check in remainingCourses
                            const courseInRemaining = remainingCourses.find(
                              (c) => c.code === genericCode,
                            );

                            // Choose the course found in either pool or remaining courses
                            const course = courseInPool || courseInRemaining;

                            return course ? course.credits : 0; // Return the course's credits or 0 if not found
                          })
                          .reduce((sum, c) => sum + c, 0);

                        // 2) Compare to max limit
                        const maxAllowed = getMaxCreditsForSemesterName(
                          semesterName,
                        );
                        const isOver = sumCredits > maxAllowed;

                        // 3) “semester-credit” + conditionally add “over-limit-warning”
                        const creditClass = isOver
                          ? 'semester-credit over-limit-warning'
                          : 'semester-credit';

                        return (
                          <div
                            key={semesterName}
                            className={`semester ${isExempted ? 'hidden-accordion' : ''} ${shakingSemesterId === semesterName
                              ? 'exceeding-credit-limit'
                              : ''
                              }`}
                          >
                            <Droppable id={semesterName} color="pink">
                              <h3>{semesterName}</h3>
                              <SortableContext
                                items={semesterCourses[semesterName]}
                                strategy={verticalListSortingStrategy}
                              >
                                {semesterCourses[semesterName].map(
                                  (instanceId) => {
                                    const genericCode = courseInstanceMap[instanceId] || instanceId;
                                    const course = allCourses.find((c) => c.code === genericCode);
                                    if (!course) return null;
                                    const isSelected =
                                      selectedCourse?.code === course.code;
                                    const isDraggingFromSemester =
                                      activeId === instanceId;

                                    // Check if prerequisites are met
                                    const prerequisitesMet =
                                      arePrerequisitesMet(course.code, index);

                                    const offeredCheck = isCourseOfferedInSemester(course, semesterName);


                                    return (
                                      <SortableCourse
                                        key={instanceId}
                                        internalId={instanceId}
                                        courseCode={allCourses.find((c) => c.code === (courseInstanceMap[instanceId] || instanceId)).code}
                                        title={course.code}
                                        disabled={false}
                                        isSelected={isSelected}
                                        isDraggingFromSemester={
                                          isDraggingFromSemester
                                        }
                                        onSelect={handleCourseSelect}
                                        containerId={semesterName}
                                        prerequisitesMet={prerequisitesMet} // Pass the prop
                                        isOffered={offeredCheck}
                                        removeButton={
                                          <button
                                            className={`remove-course-btn ${isSelected ? 'selected' : ''}`}
                                            onClick={() =>
                                              handleReturn(instanceId)
                                            }
                                          >
                                            <svg
                                              width="25"
                                              height="20"
                                              viewBox="0 0 30 24"
                                              fill="red"
                                              xmlns="http://www.w3.org/2000/svg"
                                            >{isSelected ? <rect x="2" y="11" width="22" height="4" fill="#912338" /> : <rect
                                              x="2"
                                              y="11"
                                              width="22"
                                              height="4"
                                              fill="white"
                                            />}

                                            </svg>
                                          </button>
                                        }
                                      />
                                    );
                                  },
                                )}
                              </SortableContext>

                              <div className="semester-footer">
                                <div className={creditClass}>
                                  Total Credit: {sumCredits}{' '}
                                  {isOver && (
                                    <span>
                                      <br /> Over the credit limit {maxAllowed}
                                    </span>
                                  )}
                                </div>

                                <button
                                  className="remove-semester-btn"
                                  onClick={() =>
                                    handleRemoveSemester(semesterName)
                                  }
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
                                    <path
                                      d="M19 6l-1.21 14.06A2 2 0 0 1 15.8 22H8.2a2 2 0 0 1-1.99-1.94L5 6m3 0V4a2 2 0 0 1 2-2h2
                                   a2 2 0 0 1 2 2v2"
                                    />
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

                <div className="description-and-button">
                  <button
                    className="right-toggle-button"
                    onClick={toggleCourseDescription}
                  >
                    {showCourseDescription ? '▶' : '◀'}
                  </button>
                  <div
                    className={`description-section ${showCourseDescription ? '' : 'hidden'}`}
                  >
                    {selectedCourse ? (
                      <div>
                        <h5><strong>{selectedCourse.title}</strong></h5>
                        <div><strong>Credits: </strong>{selectedCourse.credits}</div>
                        <p></p>


                        <div>
                          <strong>Offered In: </strong>
                          <p>
                            {Array.isArray(selectedCourse.offeredIn)
                              ? selectedCourse.offeredIn.length > 0
                                ? selectedCourse.offeredIn.join(', ')
                                : <i>None</i>
                              : typeof selectedCourse.offeredIn === 'string' && selectedCourse.offeredIn.trim()
                                ? selectedCourse.offeredIn
                                : <i>None</i>
                            }
                          </p>
                        </div>


                        {selectedCourse.requisites && (
                          <div>
                            {/* Display Prerequisites */}
                            {selectedCourse.requisites.filter(r => r.type.toLowerCase() === 'pre').length > 0 && (
                              <>
                                <strong>Prerequisites:</strong>
                                <ul>
                                  {(() => {
                                    const preGrouped = {};
                                    const preNonGrouped = [];
                                    selectedCourse.requisites
                                      .filter(r => r.type.toLowerCase() === 'pre')
                                      .forEach(r => {
                                        if (r.group_id) {
                                          if (!preGrouped[r.group_id]) {
                                            preGrouped[r.group_id] = [];
                                          }
                                          preGrouped[r.group_id].push(r.code2);
                                        } else {
                                          preNonGrouped.push(r.code2);
                                        }
                                      });
                                    return [
                                      ...Object.entries(preGrouped).map(([groupId, codes]) => (
                                        <li key={groupId}>{codes.join(' or ')}</li>
                                      )),
                                      ...preNonGrouped.map((code, i) => <li key={`pre-${i}`}>{code}</li>)
                                    ];
                                  })()}
                                </ul>
                              </>
                            )}

                            {/* Display Corequisites */}
                            {selectedCourse.requisites.filter(r => r.type.toLowerCase() === 'co').length > 0 && (
                              <>
                                <strong>Corequisites:</strong>
                                <ul>
                                  {(() => {
                                    const coGrouped = {};
                                    const coNonGrouped = [];
                                    selectedCourse.requisites
                                      .filter(r => r.type.toLowerCase() === 'co')
                                      .forEach(r => {
                                        if (r.group_id) {
                                          if (!coGrouped[r.group_id]) {
                                            coGrouped[r.group_id] = [];
                                          }
                                          coGrouped[r.group_id].push(r.code2);
                                        } else {
                                          coNonGrouped.push(r.code2);
                                        }
                                      });
                                    return [
                                      ...Object.entries(coGrouped).map(([groupId, codes]) => (
                                        <li key={groupId}>{codes.join(' or ')}</li>
                                      )),
                                      ...coNonGrouped.map((code, i) => <li key={`co-${i}`}>{code}</li>)
                                    ];
                                  })()}
                                </ul>
                              </>
                            )}

                            {selectedCourse.requisites.length === 0 && (
                              <>
                                <p><i>No Requisites</i></p>
                              </>
                            )}
                          </div>
                        )}
                        <p>
                          <CourseSectionButton
                            title={selectedCourse.title}
                            hidden={showCourseDescription}
                          />
                        </p>
                        <strong>Description:</strong>
                        <p data-testid="course-description">
                          {selectedCourse.description}
                        </p>
                      </div>
                    ) : (
                      <p data-testid="course-description">
                        Drag or click on a course to see its description here.
                      </p>
                    )}
                  </div>
                </div>
                <DragOverlay dropAnimation={null}>
                  {activeId ? (
                    <div className="course-item-overlay selected">
                      {activeCourseCode}
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
              <div
                style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}
              >
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
                    <option>Fall/Winter</option>
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
                      const displayYear =
                        selectedSeason === 'Fall/Winter'
                          ? `${year}-${(year + 1) % 100}`
                          : year;

                      return (
                        <option key={year} value={year}>
                          {displayYear}
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
        {isShareVisible && (
          <div className="modal-overlay" onClick={toggleShareDialog}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="close-button" onClick={toggleShareDialog}>
                ✕
              </button>
              <p>Share this timeline!</p>
              <div className="url-and-copy-btn">
                <div className="url-box">
                  <p style={{ fontSize: 'small', marginBottom: 0 }}>{`${REACT_APP_CLIENT}/timeline_change?tstring=${compressTimeline(semesterCourses, degree_Id, credsReq, extendedCredit)}`}</p>
                </div>
                <Button
                  onClick={copyToClipboard}
                  title="Copy to clipboard"
                  style={{ color: '#912338', marginLeft: '5px', backgroundColor: 'transparent', border: '1px solid black' }}
                >
                  <FaClipboard size={25} />
                </Button>
              </div>
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

              <button
                className="TL-button"
                onClick={() => {
                  // set timeline name as value of input field
                  if (tempName.trim() === '') {
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

        {/* Leave Confirm Modal */}
        <DeleteModal open={showLeaveModal} onClose={() => setShowLeaveModal(false)}>
          <div className="tw-text-center tw-w-56">
            <div className="tw-mx-auto tw-my-4 tw-w-48">
              <h3 className="tw-text-lg tw-font-black tw-text-gray-800">
                Warning
              </h3>
              <p className="tw-text-sm tw-text-gray-500">
                You have unsaved changes. Do you really want to leave?
              </p>
            </div>
            <div className="tw-flex tw-gap-4">
              <button
                className="btn btn-danger tw-w-full"
                onClick={async () => {
                  if (nextPath) {
                    setHasUnsavedChanges(false);

                    setTimeout(() => {
                      navigate(nextPath);  // Trigger navigation after delay due to setHasUnsavedChanges(false)
                    }, 250);
                  }
                }}
              >
                Leave Anyways
              </button>
              <button
                className="btn btn-light tw-w-full"
                onClick={() => setShowLeaveModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </DeleteModal>
        {showDeficiencyModal && (
          <div className="modal-overlay">
            <div className="modal-content-def">
              <button className="close-button" onClick={() => setShowDeficiencyModal(false)}>✕</button>
              <h3>Add Deficiency Courses</h3>
              <input
                type="text"
                placeholder="Search courses..."
                value={searchDeficiencyQuery}
                onChange={(e) => setSearchDeficiencyQuery(e.target.value)}
                className="course-search-input"
              />
              <div className="course-list-container">
                {allCourses
                  .filter(course => course.code.toLowerCase().includes(searchDeficiencyQuery.toLowerCase()))
                  .map(course => (
                    <div key={course.code} className="course-item">
                      {course.code}
                      <button
                        className="add-course-btn"
                        onClick={() => addDeficiencyCourse(course)}
                      >
                        +
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
        {showExemptionsModal && (
          <div className="modal-overlay">
            <div className="modal-content-def">
              <button className="close-button" onClick={() => setShowExemptionsModal(false)}>✕</button>
              <h3>Add Exempted Courses</h3>
              <input
                type="text"
                placeholder="Search courses..."
                value={searchDeficiencyQuery}
                onChange={(e) => setSearchDeficiencyQuery(e.target.value)}
                className="course-search-input"
              />
              <div className="course-list-container">
                {allCourses
                  .filter(course => course.code.toLowerCase().includes(searchDeficiencyQuery.toLowerCase()))
                  .map(course => (
                    <div key={course.code} className="course-item">
                      {course.code}
                      <button
                        className="add-course-btn"
                        onClick={() => addExemptionCourse(course)}
                      >
                        +
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </DndContext>
    </motion.div>
  );
};

export default TimelinePage;
