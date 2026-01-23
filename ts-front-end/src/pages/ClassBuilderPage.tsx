import { motion } from "framer-motion";


const ClassBuilderPage: React.FC = () => {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
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
                </div>
            </div>

        </motion.div>
    );
}

export default ClassBuilderPage;