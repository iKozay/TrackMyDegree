import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import "../styles/ClassBuilder.css";
import WeeklySchedule from "../components/ClassBuilderComponents/WeeklySchedule";
import ScheduleStats from "../components/ClassBuilderComponents/ScheduleStats";
import ScheduledCourses from "../components/ClassBuilderComponents/ScheduledCourses";
import SearchCourses from "../components/ClassBuilderComponents/SearchCourses";
import type { AddedCourse, ClassItem, CourseSection } from "src/types/classItem";

//Configuration system

const DAY_FLAGS: Array<keyof CourseSection> = [
    "sundays", "modays", "tuesdays", "wednesdays", "thursdays", "fridays", "saturdays",
];

const parseTime = (raw: string): number => {
    const [h] = raw.split(".");
    return parseInt(h, 10);
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
const configurationsForCourse = (course: AddedCourse): ClassItem[][] => {
    const byAssociation = new Map<string, CourseSection[]>();
    for (const section of course.sections) {
        if (!byAssociation.has(section.classAssociation)) byAssociation.set(section.classAssociation, []);
        byAssociation.get(section.classAssociation)!.push(section);
    }

    const allConfigs: ClassItem[][] = [];

    for (const assocSections of byAssociation.values()) {
        const byComponent = new Map<string, CourseSection[]>();
        for (const section of assocSections) {
            if (!byComponent.has(section.componentCode)) byComponent.set(section.componentCode, []);
            byComponent.get(section.componentCode)!.push(section);
        }

        const componentGroups = Array.from(byComponent.values());
        const product = (groups: CourseSection[][]): CourseSection[][] =>
            groups.reduce<CourseSection[][]>(
                (acc, group) => acc.flatMap(combo => group.map(s => [...combo, s])),
                [[]]
            );

        for (const combo of product(componentGroups)) {
            allConfigs.push(combo.flatMap(s => sectionToClassItems(course, s)));
        }
    }

    return allConfigs;
};

// Cartesian product across all courses, then filters to keep only configurations that include every pinned classNumber
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

    if (pinnedClassNumbers.size === 0) return allCombos;

    return allCombos.filter(config => {
        const classNumbersInConfig = new Set(config.map(item => item.classNumber));
        return [...pinnedClassNumbers].every(cn => classNumbersInConfig.has(cn));
    });
};

// ─── Page component ──────────────────────────────────────────────────────────

const ClassBuilderPage: React.FC = () => {
    const [addedCourses, setAddedCourses] = useState<AddedCourse[]>([]);
    const [configIndex, setConfigIndex] = useState(0);
    const [pinnedClassNumbers, setPinnedClassNumbers] = useState<Set<string>>(new Set());

    const allConfigurations = useMemo(
        () => generateAllConfigurations(addedCourses, pinnedClassNumbers),
        [addedCourses, pinnedClassNumbers]
    );

    useEffect(() => {
        setConfigIndex(0);
    }, [addedCourses, pinnedClassNumbers]);

    const currentConfig = allConfigurations[configIndex] ?? [];
    const totalConfigs = allConfigurations.length;

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
                        <ScheduleStats classes={currentConfig} />
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-3">
                                <WeeklySchedule
                                    classes={currentConfig}
                                    pinnedClassNumbers={pinnedClassNumbers}
                                    configIndex={configIndex}
                                    totalConfigs={totalConfigs}
                                    onPrev={goToPrev}
                                    onNext={goToNext}
                                    onTogglePin={togglePin}
                                />
                            </div>
                            <div className="space-y-6">
                                <SearchCourses
                                    addedCourses={addedCourses}
                                    setAddedCourses={setAddedCourses}
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
        </motion.div>
    );
};

export default ClassBuilderPage;