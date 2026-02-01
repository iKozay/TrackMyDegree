import { useState } from "react";
import { motion } from "framer-motion";
import "../styles/ClassBuilder.css";
import WeeklySchedule from "../components/ClassBuilderComponents/WeeklySchedule";
import ScheduleStats from "../components/ClassBuilderComponents/ScheduleStats";
import ScheduledCourses from "../components/ClassBuilderComponents/ScheduledCourses";

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
                                <div data-slot="card" className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border p-6">
                                    <h2 className="text-slate-900 mb-4">Search &amp; Add Courses</h2>
                                    <div className="mb-4"><label className="text-sm text-slate-600 mb-2 block">Select Semester</label><button type="button"
                                        role="combobox" aria-controls="radix-:r3:" aria-expanded="false" aria-autocomplete="none" dir="ltr"
                                        data-state="closed" data-slot="select-trigger" data-size="default"
                                        className="border-input data-[placeholder]:text-muted-foreground [&amp;_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 [&amp;_svg:not([class*='size-'])]:size-4 w-full"><span
                                            data-slot="select-value" style={{ pointerEvents: 'none' }}>Winter 2025</span><svg
                                                xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                                className="lucide lucide-chevron-down size-4 opacity-50" aria-hidden="true">
                                            <path d="m6 9 6 6 6-6"></path>
                                        </svg></button></div>
                                    <div className="relative mb-4"><label className="text-sm text-slate-600 mb-2 block">Search for Courses</label>
                                        <div className="relative"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                            className="lucide lucide-search size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                            aria-hidden="true">
                                            <path d="m21 21-4.34-4.34"></path>
                                            <circle cx="11" cy="11" r="8"></circle>
                                        </svg><input data-slot="input"
                                            className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base bg-input-background transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive pl-9"
                                            placeholder="Search by course code or name..." value="" /></div>
                                    </div>
                                </div>
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