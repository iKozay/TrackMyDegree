/* eslint-disable prettier/prettier */
// src/components/timeline/utils/TrashIcon.js

export const TrashButton = ({ onTrash, id }) => (
    <button
        className="remove-semester-btn"
        onClick={() =>
            onTrash(id)
        }
    >
        <svg
            width="1.2em"
            height="1.2em"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="3 6 5 6 21 6" />
            <path
                d="M19 6l-1.21 14.06A2 2 0 0 1 15.8 22H8.2a2 2 0 0 1-1.99-1.94L5 6m3 0V4a2 2 0 0 1 2-2h2
                                   a2 2 0 0 1 2 2v2"
            />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
    </button>
);

