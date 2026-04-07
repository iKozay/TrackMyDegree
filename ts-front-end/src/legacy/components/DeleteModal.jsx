import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { X } from "react-feather";

export default function DeleteModal({ open, onClose, children }) {
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return ReactDOM.createPortal(
        <dialog
            open
            aria-modal="true"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                width: "100vw",
                height: "100vh",
                maxWidth: "none",
                maxHeight: "none",
                backgroundColor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                padding: 0,
                margin: 0,
            }}
        >
            <button
                aria-label="Close modal"
                onClick={onClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    border: "none",
                    cursor: "default",
                    zIndex: 0,
                }}
            />
            <div
                style={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    padding: "24px",
                    minWidth: "320px",
                    maxWidth: "90%",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                    position: "relative",
                    zIndex: 1,
                }}
            >
                <button
                    aria-label="Close"
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#666",
                    }}
                >
                    <X />
                </button>

                {children}
            </div>
        </dialog>,
        document.body
    );
}

DeleteModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired,
};
