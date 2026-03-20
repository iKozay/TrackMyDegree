import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import "../styles/ClassBuilder.css";
import WeeklySchedule from "../components/ClassBuilderComponents/WeeklySchedule";
import ScheduleStats from "../components/ClassBuilderComponents/ScheduleStats";
import ScheduledCourses from "../components/ClassBuilderComponents/ScheduledCourses";
import SearchCourses from "../components/ClassBuilderComponents/SearchCourses";
import type { AddedCourse, ClassItem, CourseSection } from "src/types/classItem";

//Configuration system

const DAY_FLAGS: Array<keyof CourseSection> = [
    "sundays", "mondays", "tuesdays", "wednesdays", "thursdays", "fridays", "saturdays",
];

const parseTime = (raw: string): number => {
    const [h] = raw.split(".");
    return Number.parseInt(h, 10);
};

const sectionToClassItems = (course: AddedCourse, section: CourseSection): ClassItem[] => {
    if (!section.classStartTime || section.classStartTime === "00.00.00") return [];
    const items: ClassItem[] = [];
    DAY_FLAGS.forEach((flag, dayIndex) => {
        if (section[flag] === "Y") {
            items.push({
                classNumber: section.classNumber,
                name: course.code,
                section: section.section,
                room: section.room || section.roomCode,
                day: dayIndex,
                startTime: parseTime(section.classStartTime),
                endTime: parseTime(section.classEndTime),
            });
        }
    });
    return items;
};

// Returns all valid ClassItem[][] configurations for a single AddedCourse
const cartesianProduct = (groups: CourseSection[][]): CourseSection[][] => {
    const result: CourseSection[][] = [[]];

    for (const group of groups) {
        const next: CourseSection[][] = [];

        for (const combo of result) {
            for (const section of group) {
                next.push([...combo, section]);
            }
        }

        result.splice(0, result.length, ...next);
    }

    return result;
};

const configurationsForCourse = (course: AddedCourse): ClassItem[][] => {
    const byAssociation = new Map<string, CourseSection[]>();

    for (const section of course.sections) {
        if (!byAssociation.has(section.classAssociation)) {
            byAssociation.set(section.classAssociation, []);
        }
        byAssociation.get(section.classAssociation)!.push(section);
    }

    const allConfigs: ClassItem[][] = [];

    for (const assocSections of byAssociation.values()) {
        const byComponent = new Map<string, CourseSection[]>();

        for (const section of assocSections) {
            if (!byComponent.has(section.componentCode)) {
                byComponent.set(section.componentCode, []);
            }
            byComponent.get(section.componentCode)!.push(section);
        }

        const componentGroups = Array.from(byComponent.values());
        const combos = cartesianProduct(componentGroups);

        for (const combo of combos) {
            const classItems: ClassItem[] = [];

            for (const section of combo) {
                const items = sectionToClassItems(course, section);
                classItems.push(...items);
            }

            allConfigs.push(classItems);
        }
    }

    return allConfigs;
};

// Returns true if any two ClassItems in the config overlap on the same day.
const hasConflict = (config: ClassItem[]): boolean => {
    for (let i = 0; i < config.length; i++) {
        for (let j = i + 1; j < config.length; j++) {
            const a = config[i];
            const b = config[j];
            if (
                a.day === b.day &&
                a.startTime < b.endTime &&
                b.startTime < a.endTime
            ) {
                return true;
            }
        }
    }
    return false;
};

// Cartesian product across all courses, filters out conflicting configs,
// then filters to keep only configurations that include every pinned classNumber.
const generateAllConfigurations = (
    addedCourses: AddedCourse[],
    pinnedClassNumbers: Set<string>
): ClassItem[][] => {
    if (addedCourses.length === 0) return [[]];

    const perCourse = addedCourses.map(configurationsForCourse);

    const allCombos = perCourse.reduce<ClassItem[][]>(
        (acc, courseConfigs) =>
            acc.flatMap(globalCombo =>
                courseConfigs.map(courseConfig => [...globalCombo, ...courseConfig])
            ),
        [[]]
    );

    const conflictFree = allCombos.filter(config => !hasConflict(config));

    if (pinnedClassNumbers.size === 0) return conflictFree;

    return conflictFree.filter(config => {
        const classNumbersInConfig = new Set(config.map(item => item.classNumber));
        return [...pinnedClassNumbers].every(cn => classNumbersInConfig.has(cn));
    });
};

// ─── Page component ──────────────────────────────────────────────────────────

const ClassBuilderPage: React.FC = () => {
    const [addedCourses, setAddedCourses] = useState<AddedCourse[]>([]);
    const [configIndex, setConfigIndex] = useState(0);
    const [pinnedClassNumbers, setPinnedClassNumbers] = useState<Set<string>>(new Set());
    const [conflictModalDismissed, setConflictModalDismissed] = useState(false);

    const allConfigurations = useMemo(
        () => generateAllConfigurations(addedCourses, pinnedClassNumbers),
        [addedCourses, pinnedClassNumbers]
    );

    const noValidConfigs = addedCourses.length > 0 && allConfigurations.length === 0;

    const showConflictModal = noValidConfigs && !conflictModalDismissed;

    const totalConfigs = allConfigurations.length;

    const safeConfigIndex = Math.min(configIndex, Math.max(0, totalConfigs - 1));

    const currentConfig = noValidConfigs ? [] : (allConfigurations[safeConfigIndex] ?? []);

    const goToPrev = () => setConfigIndex(i => Math.max(0, i - 1));
    const goToNext = () => setConfigIndex(i => Math.min(totalConfigs - 1, i + 1));

    const togglePin = (classNumber: string) => {
        setPinnedClassNumbers(prev => {
            const next = new Set(prev);
            if (next.has(classNumber)) {
                next.delete(classNumber);
            } else {
                next.add(classNumber);
            }
            return next;
        });
        setConfigIndex(0);
    };

    const handleSetAddedCourses = (courses: AddedCourse[]) => {
        const remainingClassNumbers = new Set(
            courses.flatMap(c => c.sections.map(s => s.classNumber))
        );
        setPinnedClassNumbers(prev => {
            const next = new Set([...prev].filter(cn => remainingClassNumbers.has(cn)));
            return next;
        });
        setAddedCourses(courses);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <main className="flex-1 overflow-auto lg:pt-0 pt-16">
                <div className="p-4 sm:p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
                            <div>
                                <h1 className="text-slate-900 mb-2">Class Builder</h1>
                                <p className="text-slate-600">Create and visualize student schedules to identify conflicts</p>
                            </div>
                            {/*<div className="flex gap-3 w-full sm:w-auto">
                                <button data-slot="button"
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-4 py-2 has-[>svg]:px-3 w-full sm:w-auto">
                                    Export Schedule
                                </button>
                            </div>*/}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-3">
                                <WeeklySchedule
                                    classes={currentConfig}
                                    pinnedClassNumbers={pinnedClassNumbers}
                                    configIndex={safeConfigIndex}
                                    totalConfigs={noValidConfigs ? 0 : totalConfigs}
                                    onPrev={goToPrev}
                                    onNext={goToNext}
                                    onTogglePin={togglePin}
                                />
                            </div>

                            <div className="space-y-6">
                                <ScheduleStats classes={currentConfig} />
                                <SearchCourses
                                    addedCourses={addedCourses}
                                    setAddedCourses={setAddedCourses}
                                    onSemesterChange={() => handleSetAddedCourses([])}
                                />
                                <ScheduledCourses
                                    addedCourses={addedCourses}
                                    setAddedCourses={handleSetAddedCourses}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {showConflictModal && (
                <>
                    <style>{`
                        .cb-conflict-overlay {
                            position: fixed;
                            inset: 0;
                            background: rgba(0, 0, 0, 0.4);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 50;
                        }

                        .cb-conflict-modal {
                            background-color: var(--card);
                            color: var(--card-foreground);
                            border-radius: calc(var(--radius) + 4px);
                            border: 1px solid var(--border);
                            padding: 1.75rem;
                            max-width: 22rem;
                            width: calc(100% - 2rem);
                            display: flex;
                            flex-direction: column;
                            gap: 1rem;
                            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                        }

                        .cb-conflict-modal__icon {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            width: 2.75rem;
                            height: 2.75rem;
                            border-radius: 50%;
                            flex-shrink: 0;
                            background-color: var(--color-rose-50, #fff1f2);
                        }

                        .cb-conflict-modal__icon svg {
                            width: 1.375rem;
                            height: 1.375rem;
                            color: var(--color-rose-600, #e11d48);
                        }

                        .cb-conflict-modal__title {
                            font-size: 1rem;
                            font-weight: 600;
                            color: var(--color-slate-900);
                            margin: 0;
                        }

                        .cb-conflict-modal__body {
                            font-size: 0.875rem;
                            color: var(--color-slate-600);
                            margin: 0;
                            line-height: 1.5;
                        }

                        .cb-conflict-modal__body strong {
                            color: var(--color-slate-900);
                        }

                        .cb-conflict-modal__close {
                            align-self: flex-end;
                            height: 2.25rem;
                            padding: 0 1rem;
                            font-size: 0.875rem;
                            font-weight: 500;
                            border-radius: calc(var(--radius) - 2px);
                            border: 1px solid var(--border);
                            background: transparent;
                            color: var(--color-slate-700);
                            cursor: pointer;
                            transition: background-color 0.15s ease;
                        }

                        .cb-conflict-modal__close:hover {
                            background-color: var(--color-slate-100, #f1f5f9);
                        }
                    `}</style>

                    <button
                        className="cb-conflict-overlay"
                        onClick={() => setConflictModalDismissed(true)}
                    >
                        <button
                            className="cb-conflict-modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="cb-conflict-modal__icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    aria-hidden="true">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 8v4"></path>
                                    <path d="M12 16h.01"></path>
                                </svg>
                            </div>

                            <p className="cb-conflict-modal__title">No Valid Schedules</p>

                            <p className="cb-conflict-modal__body">
                                Every possible combination of your selected courses results in a <strong>time conflict</strong>. Try removing a course or unpinning a section to open up more options.
                            </p>

                            <button
                                className="cb-conflict-modal__close"
                                onClick={() => setConflictModalDismissed(true)}
                            >
                                Got it
                            </button>
                        </button>
                    </button>
                </>
            )}
        </motion.div>
    );
};

export default ClassBuilderPage;