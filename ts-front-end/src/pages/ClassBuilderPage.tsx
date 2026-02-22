import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import "../styles/ClassBuilder.css";
import WeeklySchedule from "../components/ClassBuilderComponents/WeeklySchedule";
import ScheduleStats from "../components/ClassBuilderComponents/ScheduleStats";
import ScheduledCourses from "../components/ClassBuilderComponents/ScheduledCourses";
import SearchCourses from "../components/ClassBuilderComponents/SearchCourses";
import type { AddedCourse, ClassItem, CourseSection } from "src/types/classItem";

// ─── Configuration engine ────────────────────────────────────────────────────

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

// Returns all valid ClassItem[] configurations for a single AddedCourse.
// Sections are grouped by classAssociation first, then by componentCode within
// each association. A valid pick is one section per componentCode per association,
// giving the cartesian product across component types.
const configurationsForCourse = (course: AddedCourse): ClassItem[][] => {
    // Group by association
    const byAssociation = new Map<string, CourseSection[]>();
    for (const section of course.sections) {
        const key = section.classAssociation;
        if (!byAssociation.has(key)) byAssociation.set(key, []);
        byAssociation.get(key)!.push(section);
    }

    const allConfigs: ClassItem[][] = [];

    for (const assocSections of byAssociation.values()) {
        // Group by componentCode within this association
        const byComponent = new Map<string, CourseSection[]>();
        for (const section of assocSections) {
            if (!byComponent.has(section.componentCode)) byComponent.set(section.componentCode, []);
            byComponent.get(section.componentCode)!.push(section);
        }

        // Cartesian product across component types
        const componentGroups = Array.from(byComponent.values());
        const product = (groups: CourseSection[][]): CourseSection[][] => {
            return groups.reduce<CourseSection[][]>(
                (acc, group) => acc.flatMap(combo => group.map(section => [...combo, section])),
                [[]]
            );
        };

        for (const combo of product(componentGroups)) {
            const items = combo.flatMap(section => sectionToClassItems(course, section));
            allConfigs.push(items);
        }
    }

    return allConfigs;
};

// Combines per-course configurations into all global configurations via
// cartesian product across courses.
const generateAllConfigurations = (addedCourses: AddedCourse[]): ClassItem[][] => {
    if (addedCourses.length === 0) return [[]];

    const perCourse = addedCourses.map(configurationsForCourse);

    return perCourse.reduce<ClassItem[][]>(
        (acc, courseConfigs) =>
            acc.flatMap(globalCombo =>
                courseConfigs.map(courseConfig => [...globalCombo, ...courseConfig])
            ),
        [[]]
    );
};

// ─── Page component ──────────────────────────────────────────────────────────

const ClassBuilderPage: React.FC = () => {
    const [addedCourses, setAddedCourses] = useState<AddedCourse[]>([]);
    const [configIndex, setConfigIndex] = useState(0);

    const allConfigurations = useMemo(
        () => generateAllConfigurations(addedCourses),
        [addedCourses]
    );

    // Reset to first configuration whenever the course list changes
    useEffect(() => {
        setConfigIndex(0);
    }, [addedCourses]);

    const currentConfig = allConfigurations[configIndex] ?? [];
    const totalConfigs = allConfigurations.length;

    const goToPrev = () => setConfigIndex(i => Math.max(0, i - 1));
    const goToNext = () => setConfigIndex(i => Math.min(totalConfigs - 1, i + 1));

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
                            <div className="flex gap-3 w-full sm:w-auto">
                                <button data-slot="button"
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-4 py-2 has-[>svg]:px-3 w-full sm:w-auto">
                                    Export Schedule
                                </button>
                            </div>
                        </div>
                        <ScheduleStats classes={currentConfig} />
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-3">
                                <WeeklySchedule
                                    classes={currentConfig}
                                    configIndex={configIndex}
                                    totalConfigs={totalConfigs}
                                    onPrev={goToPrev}
                                    onNext={goToNext}
                                />
                            </div>
                            <div className="space-y-6">
                                <SearchCourses
                                    addedCourses={addedCourses}
                                    setAddedCourses={setAddedCourses}
                                />
                                <ScheduledCourses
                                    addedCourses={addedCourses}
                                    setAddedCourses={setAddedCourses}
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