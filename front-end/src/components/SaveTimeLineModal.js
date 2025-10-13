/* eslint-disable prettier/prettier */
import { useState } from 'react';

export const SaveTimelineModal = ({ open, onClose, onSave, initialValue = '', }) => {

    const [tempName, setTempName] = useState(initialValue);

    const handleClose = () => {
        // Only close if there is no input OR if you intentionally want to discard changes
        if (tempName.trim() === '') {
            onClose();
        } else {
            // Optionally confirm with user before closing if there's data
            if (window.confirm('You have entered a name. Close without saving?')) {
                onClose();
            }
        }
    };

    const handleSave = () => {
        if (tempName.trim() === '') {
            alert('Please enter a name before saving.');
            return;
        }
        onSave(tempName);

    };

    if (!open) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                {/* Close Button */}
                <button className="close-button" onClick={handleClose}>
                    ✕
                </button>

                <p className="tw-text-lg tw-font-bold">Save Timeline</p>
                <hr className="tw-mb-4" />

                {/* Input Field */}
                <div className="tw-mb-4">
                    <label className="tw-block tw-mb-2">Enter a name for your timeline:</label>
                    <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        placeholder="e.g. My Winter Plan"
                        className="tw-w-full tw-p-2 tw-border tw-rounded"
                    />
                </div>

                {/* Save Button */}
                <button className="TL-button" onClick={handleSave}>
                    Save
                </button>
            </div>
        </div>
    );
}
