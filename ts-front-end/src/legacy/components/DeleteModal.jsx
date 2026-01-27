import React from "react";
import { X } from "react-feather";

export default function DeleteModal({ open, onClose, children }) {
    if (!open) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    padding: "24px",
                    minWidth: "320px",
                    maxWidth: "90%",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                    position: "relative",
                }}
            >
                <button
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
        </div>
    );
}
