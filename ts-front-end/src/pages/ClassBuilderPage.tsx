import { motion } from "framer-motion";


const ClassBuilderPage: React.FC = () => {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div data-slot="card" className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border p-6">
                        <div className="flex items-center gap-2 mb-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                            stroke-linejoin="round" className="lucide lucide-clock size-5 text-rose-800" aria-hidden="true">
                            <path d="M12 6v6l4 2"></path>
                            <circle cx="12" cy="12" r="10"></circle>
                        </svg><span className="text-slate-600">Total Hours</span></div>
                        <p className="text-slate-900">9 hours/week</p>
                    </div>
                    <div data-slot="card" className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border p-6">
                        <div className="flex items-center gap-2 mb-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                            stroke-linejoin="round" className="lucide lucide-users size-5 text-green-600" aria-hidden="true">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <path d="M16 3.128a4 4 0 0 1 0 7.744"></path>
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                        </svg><span className="text-slate-600">Enrolled Courses</span></div>
                        <p className="text-slate-900">3 courses</p>
                    </div>
                    <div data-slot="card" className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border p-6">
                        <div className="flex items-center gap-2 mb-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                            stroke-linejoin="round" className="lucide lucide-triangle-alert size-5 text-red-600" aria-hidden="true">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
                            <path d="M12 9v4"></path>
                            <path d="M12 17h.01"></path>
                        </svg><span className="text-slate-600">Conflicts</span></div>
                        <p className="text-slate-900">0</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                        <div data-slot="card" className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border p-6">
                            <h2 className="text-slate-900 mb-4">Weekly Schedule</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="border border-slate-200 p-2 bg-slate-50 w-20 text-slate-600">Time</th>
                                            <th className="border border-slate-200 p-2 bg-slate-50 text-slate-900">Mon</th>
                                            <th className="border border-slate-200 p-2 bg-slate-50 text-slate-900">Tue</th>
                                            <th className="border border-slate-200 p-2 bg-slate-50 text-slate-900">Wed</th>
                                            <th className="border border-slate-200 p-2 bg-slate-50 text-slate-900">Thu</th>
                                            <th className="border border-slate-200 p-2 bg-slate-50 text-slate-900">Fri</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-slate-200 p-2 text-sm text-slate-600 text-center">8:00</td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-200 p-2 text-sm text-slate-600 text-center">9:00</td>
                                            <td className="border border-slate-200 p-2 relative bg-rose-100 ">
                                                <div className="text-xs " style={{ zIndex: 0 }}>
                                                    <div className="">
                                                        <p className="text-rose-900">COMP 352</p>
                                                        <p className="text-rose-700">Sec A</p>
                                                        <p className="text-rose-600">H-637</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative bg-rose-100 ">
                                                <div className="text-xs " style={{ zIndex: 0 }}>
                                                    <div className="">
                                                        <p className="text-rose-900">COMP 352</p>
                                                        <p className="text-rose-700">Sec A</p>
                                                        <p className="text-rose-600">H-637</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-200 p-2 text-sm text-slate-600 text-center">10:00</td>
                                            <td className="border border-slate-200 p-2 relative bg-rose-100 "></td>
                                            <td className="border border-slate-200 p-2 relative bg-rose-100 ">
                                                <div className="text-xs " style={{ zIndex: 0 }}>
                                                    <div className="">
                                                        <p className="text-rose-900">COMP 346</p>
                                                        <p className="text-rose-700">Sec B</p>
                                                        <p className="text-rose-600">MB-2.210</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="border border-slate-200 p-2 relative bg-rose-100 "></td>
                                            <td className="border border-slate-200 p-2 relative bg-rose-100 ">
                                                <div className="text-xs " style={{ zIndex: 0 }}>
                                                    <div className="">
                                                        <p className="text-rose-900">COMP 346</p>
                                                        <p className="text-rose-700">Sec B</p>
                                                        <p className="text-rose-600">MB-2.210</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-200 p-2 text-sm text-slate-600 text-center">11:00</td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative bg-rose-100 "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative bg-rose-100 "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-200 p-2 text-sm text-slate-600 text-center">12:00</td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-200 p-2 text-sm text-slate-600 text-center">13:00</td>
                                            <td className="border border-slate-200 p-2 relative bg-rose-100 ">
                                                <div className="text-xs " style={{ zIndex: 0 }}>
                                                    <div className="">
                                                        <p className="text-rose-900">SOEN 341</p>
                                                        <p className="text-rose-700">Sec C</p>
                                                        <p className="text-rose-600">H-537</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative bg-rose-100 ">
                                                <div className="text-xs " style={{ zIndex: 0 }}>
                                                    <div className="">
                                                        <p className="text-rose-900">SOEN 341</p>
                                                        <p className="text-rose-700">Sec C</p>
                                                        <p className="text-rose-600">H-537</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-200 p-2 text-sm text-slate-600 text-center">14:00</td>
                                            <td className="border border-slate-200 p-2 relative bg-rose-100 "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative bg-rose-100 "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-200 p-2 text-sm text-slate-600 text-center">15:00</td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-200 p-2 text-sm text-slate-600 text-center">16:00</td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-200 p-2 text-sm text-slate-600 text-center">17:00</td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-200 p-2 text-sm text-slate-600 text-center">18:00</td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-200 p-2 text-sm text-slate-600 text-center">19:00</td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-200 p-2 text-sm text-slate-600 text-center">20:00</td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                            <td className="border border-slate-200 p-2 relative  "></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
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
                        <div data-slot="card" className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border p-6">
                            <h2 className="text-slate-900 mb-4">Scheduled Courses</h2>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                <div className="p-3 rounded-lg border-2 bg-slate-50 border-transparent">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-slate-900">COMP 352 A</p>
                                            </div>
                                            <p className="text-xs mt-1 text-slate-600">Data Structures and Algorithms</p>
                                            <p className="text-xs mt-1 text-slate-500">Dr. Smith</p>
                                        </div><button data-slot="button"
                                            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 shrink-0 [&amp;_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 rounded-md gap-1.5 has-[&gt;svg]:px-2.5 h-8 w-8 p-0"><svg
                                                xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                                className="lucide lucide-trash2 lucide-trash-2 size-4 text-red-600" aria-hidden="true">
                                                <path d="M10 11v6"></path>
                                                <path d="M14 11v6"></path>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                                <path d="M3 6h18"></path>
                                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg></button>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-600"><svg xmlns="http://www.w3.org/2000/svg"
                                        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-clock size-3"
                                        aria-hidden="true">
                                        <path d="M12 6v6l4 2"></path>
                                        <circle cx="12" cy="12" r="10"></circle>
                                    </svg><span>Mon, Wed 09:00-10:30</span></div>
                                    <div className="flex items-center gap-2 text-xs mt-1 text-slate-600"><svg xmlns="http://www.w3.org/2000/svg"
                                        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-map-pin size-3"
                                        aria-hidden="true">
                                        <path
                                            d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0">
                                        </path>
                                        <circle cx="12" cy="10" r="3"></circle>
                                    </svg><span>H-637</span></div>
                                    <div className="flex items-center gap-2 text-xs mt-1 text-slate-600"><svg xmlns="http://www.w3.org/2000/svg"
                                        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-users size-3"
                                        aria-hidden="true">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                        <path d="M16 3.128a4 4 0 0 1 0 7.744"></path>
                                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                    </svg><span>68/80 enrolled</span></div>
                                </div>
                                <div className="p-3 rounded-lg border-2 bg-slate-50 border-transparent">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-slate-900">COMP 346 B</p>
                                            </div>
                                            <p className="text-xs mt-1 text-slate-600">Operating Systems</p>
                                            <p className="text-xs mt-1 text-slate-500">Dr. Johnson</p>
                                        </div><button data-slot="button"
                                            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 shrink-0 [&amp;_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 rounded-md gap-1.5 has-[&gt;svg]:px-2.5 h-8 w-8 p-0"><svg
                                                xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                                className="lucide lucide-trash2 lucide-trash-2 size-4 text-red-600" aria-hidden="true">
                                                <path d="M10 11v6"></path>
                                                <path d="M14 11v6"></path>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                                <path d="M3 6h18"></path>
                                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg></button>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-600"><svg xmlns="http://www.w3.org/2000/svg"
                                        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-clock size-3"
                                        aria-hidden="true">
                                        <path d="M12 6v6l4 2"></path>
                                        <circle cx="12" cy="12" r="10"></circle>
                                    </svg><span>Tue, Thu 10:00-11:30</span></div>
                                    <div className="flex items-center gap-2 text-xs mt-1 text-slate-600"><svg xmlns="http://www.w3.org/2000/svg"
                                        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-map-pin size-3"
                                        aria-hidden="true">
                                        <path
                                            d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0">
                                        </path>
                                        <circle cx="12" cy="10" r="3"></circle>
                                    </svg><span>MB-2.210</span></div>
                                    <div className="flex items-center gap-2 text-xs mt-1 text-slate-600"><svg xmlns="http://www.w3.org/2000/svg"
                                        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-users size-3"
                                        aria-hidden="true">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                        <path d="M16 3.128a4 4 0 0 1 0 7.744"></path>
                                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                    </svg><span>54/60 enrolled</span></div>
                                </div>
                                <div className="p-3 rounded-lg border-2 bg-slate-50 border-transparent">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-slate-900">SOEN 341 C</p>
                                            </div>
                                            <p className="text-xs mt-1 text-slate-600">Software Process</p>
                                            <p className="text-xs mt-1 text-slate-500">Dr. Williams</p>
                                        </div><button data-slot="button"
                                            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 shrink-0 [&amp;_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 rounded-md gap-1.5 has-[&gt;svg]:px-2.5 h-8 w-8 p-0"><svg
                                                xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                                className="lucide lucide-trash2 lucide-trash-2 size-4 text-red-600" aria-hidden="true">
                                                <path d="M10 11v6"></path>
                                                <path d="M14 11v6"></path>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                                <path d="M3 6h18"></path>
                                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg></button>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-600"><svg xmlns="http://www.w3.org/2000/svg"
                                        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-clock size-3"
                                        aria-hidden="true">
                                        <path d="M12 6v6l4 2"></path>
                                        <circle cx="12" cy="12" r="10"></circle>
                                    </svg><span>Mon, Wed 13:00-14:30</span></div>
                                    <div className="flex items-center gap-2 text-xs mt-1 text-slate-600"><svg xmlns="http://www.w3.org/2000/svg"
                                        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-map-pin size-3"
                                        aria-hidden="true">
                                        <path
                                            d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0">
                                        </path>
                                        <circle cx="12" cy="10" r="3"></circle>
                                    </svg><span>H-537</span></div>
                                    <div className="flex items-center gap-2 text-xs mt-1 text-slate-600"><svg xmlns="http://www.w3.org/2000/svg"
                                        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-users size-3"
                                        aria-hidden="true">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                        <path d="M16 3.128a4 4 0 0 1 0 7.744" />
                                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                    </svg><span>65/70 enrolled</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </motion.div>
    );
}

export default ClassBuilderPage;