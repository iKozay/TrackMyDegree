/* eslint-disable prettier/prettier */
import React, { useState } from 'react';

export const ItemAddingModal = ({ title, allCourses, onClose, onAdd }) => {

    const [searchQuery, setSearchQuery] = useState('')

    return (
        <div className="modal-overlay">
            <div className="modal-content-def">
                <button className="close-button" onClick={() => onClose(false)}>✕</button>
                <h3>{title}</h3>
                <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="course-search-input"
                />
                <div className="course-list-container">
                    {allCourses
                        .filter(course => course.code.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(course => (
                            <div key={course.code} className="course-item">
                                {course.code}
                                <button
                                    className="add-course-btn"
                                    onClick={() => onAdd(course)}
                                >
                                    +
                                </button>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    )




}