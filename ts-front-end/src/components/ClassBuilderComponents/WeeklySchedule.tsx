import type React from "react";

const WeeklySchedule: React.FC = () => {
    return (
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
    )
}

export default WeeklySchedule;