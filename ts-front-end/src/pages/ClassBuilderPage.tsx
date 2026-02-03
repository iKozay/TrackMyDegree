import { useState } from "react";
import { motion } from "framer-motion";
import "../styles/ClassBuilder.css";
import WeeklySchedule from "../components/ClassBuilderComponents/WeeklySchedule";
import ScheduleStats from "../components/ClassBuilderComponents/ScheduleStats";
import ScheduledCourses from "../components/ClassBuilderComponents/ScheduledCourses";
import SearchCourses from "../components/ClassBuilderComponents/SearchCourses";

export interface ClassItem {
    name: string;
    section: string;
    room: string;
    day: number; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    startTime: number; // hour in 24h format (8-22)
    endTime: number; // hour in 24h format (8-22)
}

const ClassBuilderPage: React.FC = () => {
    const [classes, setClasses] = useState<ClassItem[]>([
        { name: "COMP 352", section: "Sec A", room: "H-637", day: 1, startTime: 9, endTime: 11 },
        { name: "COMP 352", section: "Sec A", room: "H-637", day: 3, startTime: 9, endTime: 11 },
        { name: "COMP 346", section: "Sec B", room: "MB-2.210", day: 2, startTime: 10, endTime: 12 },
        { name: "COMP 346", section: "Sec B", room: "MB-2.210", day: 4, startTime: 10, endTime: 12 },
        { name: "SOEN 341", section: "Sec C", room: "H-537", day: 1, startTime: 13, endTime: 15 },
        { name: "SOEN 341", section: "Sec C", room: "H-537", day: 3, startTime: 13, endTime: 15 },
    ]);

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
                            <div className="flex gap-3 w-full sm:w-auto"><button data-slot="button"
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 shrink-0 [&amp;_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-4 py-2 has-[&gt;svg]:px-3 w-full sm:w-auto">Export
                                Schedule</button></div>
                        </div>
                        <ScheduleStats classes={classes} />
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-3">
                                <WeeklySchedule classes={classes} />
                            </div>
                            <div className="space-y-6">
                                <SearchCourses />
                                <ScheduledCourses classes={classes} setClasses={setClasses} />
                            </div>

                        </div>
                    </div>
                </div>
            </main>

        </motion.div>
    );
}

export default ClassBuilderPage;