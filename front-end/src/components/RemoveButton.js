/* eslint-disable prettier/prettier */
// src/components/timeline/utils/RemoveButton.js

export const RemoveButton = ({ isSelected, onRemove }) => (
    <button
        className={`remove-course-btn ${isSelected ? 'selected' : ''}`}
        onClick={onRemove}
    >
        <svg
            width="25"
            height="20"
            viewBox="0 0 30 24"
            fill="red"
            xmlns="http://www.w3.org/2000/svg"
        >
            {isSelected ? (
                <rect x="2" y="11" width="22" height="4" fill="#912338" />
            ) : (
                <rect x="2" y="11" width="22" height="4" fill="white" />
            )}
        </svg>
    </button>
);
