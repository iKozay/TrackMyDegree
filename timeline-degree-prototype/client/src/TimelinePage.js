import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { Plus, AlertTriangle, Save } from 'lucide-react';
import CoursePool from './components/CoursePool';
import Timeline from './components/Timeline';
import CourseDetails from './components/CourseDetails';
import axios from "axios";
import './App.css';

function TimeLinePage() {
    const { jobId } = useParams();

    const [status, setStatus] = useState("loading");
    const [pools, setPools] = useState({});
    const [courses, setCourses] = useState({});
    const [semesters, setSemesters] = useState({});
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [activeId, setActiveId] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchResult = async () => {
            try {
                const res = await axios.get(`http://localhost:4000/api/${jobId}`);
                const job = res.data;

                if (!isMounted) return;

                setStatus(job.status);

                if (job.status === "done" && job.result) {
                    const { pools, courses, semesters } = job.result;
                    setPools(pools);
                    setCourses(courses);
                    setSemesters(semesters);
                    clearInterval(intervalId);   // ✅ stop polling once done
                }
            } catch (err) {
                console.error("Error fetching result:", err);
            }
        };

        const intervalId = setInterval(fetchResult, 1000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [jobId]);




    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;
        setActiveId(null);
        if (!over) return;

        const courseCode = active.id;

        // origin & destination metadata
        const from = active.data?.current;   // { source:'pool' } OR { source:'timeline', semesterId:'fall-2025' }
        let to = over.data?.current;         // { type:'semester', semesterId:'winter-2026' } (or item-level data)
        // If using Sortable, "over" can be an item. Prefer its container if provided.
        const toSemesterId = to?.semesterId;


        if (!from || !toSemesterId) return;

        // ---------- pool -> timeline (semester) ----------
        if (from.source === 'pool') {


            // add to target semester (avoid dup)
            setSemesters(prev => {
                const idx = prev.findIndex(obj => Object.prototype.hasOwnProperty.call(obj, toSemesterId));
                if (idx === -1) return prev; // semester not found, no change

                // clone the array and the target object
                const next = prev.slice();
                const targetObj = { ...next[idx] };

                // clone the course list and update
                const list = Array.isArray(targetObj[toSemesterId]) ? [...targetObj[toSemesterId]] : [];
                if (!list.includes(courseCode)) list.push(courseCode);

                // write back and return
                targetObj[toSemesterId] = list;
                next[idx] = targetObj;
                return next;
            });

            // mark planned with semester
            setCourses(prev => ({
                ...prev,
                [courseCode]: {
                    ...prev[courseCode],
                    status: {
                        ...prev[courseCode].status,
                        status: 'planned',
                        semester: toSemesterId,
                    },
                },
            }));
            return;
        }

        // ---------- timeline -> timeline (between semesters) ----------
        if (from.source === 'timeline') {
            const fromSemesterId = from.semesterId;
            if (!fromSemesterId || fromSemesterId === toSemesterId) return; // same list or unknown

            setSemesters(prev => {
                const fromIdx = prev.findIndex(o => Object.prototype.hasOwnProperty.call(o, fromSemesterId));
                const toIdx = prev.findIndex(o => Object.prototype.hasOwnProperty.call(o, toSemesterId));
                if (fromIdx === -1 || toIdx === -1) return prev;

                const next = prev.slice();

                // remove from old
                const fromObj = { ...next[fromIdx] };
                const fromList = (fromObj[fromSemesterId] || []).filter(c => c !== courseCode);
                fromObj[fromSemesterId] = fromList;
                next[fromIdx] = fromObj;

                // add to new (avoid dup)
                const toObj = { ...next[toIdx] };
                const toList = Array.isArray(toObj[toSemesterId]) ? [...toObj[toSemesterId]] : [];
                if (!toList.includes(courseCode)) toList.push(courseCode);
                toObj[toSemesterId] = toList;
                next[toIdx] = toObj;

                return next;
            });
        }

    };
    if (status === "loading" || status === "processing")
        return <h2>⏳ Loading timeline...</h2>;

    if (status === "error")
        return <h2>❌ Could not load timeline data.</h2>;


    return (
        <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="app">
                <header className="app-header">
                    <h1>Course Timeline Planner</h1>
                    <div className="header-actions">
                        <button className="btn btn-warning">
                            <AlertTriangle size={16} />
                            Add Deficiency
                        </button>
                        <button className="btn btn-success">
                            <Plus size={16} />
                            Add Exemption
                        </button>
                        <button className="btn btn-primary">
                            <Plus size={16} />
                            Add Semester
                        </button>
                        <button className="btn btn-secondary">
                            <Save size={16} />
                            Save Data
                        </button>
                    </div>
                </header>

                <main className="timeline-main">
                    <aside className="sidebar-left">
                        <CoursePool
                            pools={pools}
                            courses={courses}
                            onCourseSelect={setSelectedCourse}
                            selectedCourse={selectedCourse}
                        />
                    </aside>

                    <section className="timeline-section">
                        <Timeline
                            semesters={semesters}
                            courses={courses}
                            onCourseSelect={setSelectedCourse}
                            selectedCourse={selectedCourse}

                        />
                    </section>

                    <aside className="sidebar-right">
                        <CourseDetails
                            course={selectedCourse ? courses[selectedCourse] : null}
                            courses={courses}
                        />
                    </aside>
                </main>

                <DragOverlay>
                    {activeId ? (
                        <div className="course-card dragging">
                            {activeId}
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
}

export default TimeLinePage;
