import { useState } from "react";
import { motion } from "framer-motion";
import "../styles/ClassBuilder.css";
import WeeklySchedule from "../components/ClassBuilderComponents/WeeklySchedule";
import ScheduleStats from "../components/ClassBuilderComponents/ScheduleStats";
import ScheduledCourses from "../components/ClassBuilderComponents/ScheduledCourses";
import SearchCourses from "../components/ClassBuilderComponents/SearchCourses";
import type { AddedCourse, ClassItem } from "src/types/classItem";


const deriveCurrentConfig = (addedCourses: AddedCourse[]): ClassItem[] => {
    const DAY_FLAGS: Array<keyof import("src/types/classItem").CourseSection> = [
        "sundays", "modays", "tuesdays", "wednesdays", "thursdays", "fridays", "saturdays",
    ];

    const parseTime = (raw: string): number => {
        const [h] = raw.split(".");
        return parseInt(h, 10);
    };

    const items: ClassItem[] = [];

    for (const course of addedCourses) {
        const byComponent = new Map<string, typeof course.sections[0]>();
        for (const section of course.sections) {
            if (!byComponent.has(section.componentCode)) {
                byComponent.set(section.componentCode, section);
            }
        }

        for (const section of byComponent.values()) {
            if (!section.classStartTime || section.classStartTime === "00.00.00") continue;

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
        }
    }

    return items;
};

const ClassBuilderPage: React.FC = () => {
    const [addedCourses, setAddedCourses] = useState<AddedCourse[]>([]);

    const currentConfig = deriveCurrentConfig(addedCourses);

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
                                <WeeklySchedule classes={currentConfig} />
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