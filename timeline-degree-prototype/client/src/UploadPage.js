import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function UploadPage() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // call your backend
            const res = await axios.post("http://localhost:4000/api/process", {
                data: "mock user data",
            });

            const jobId = res.data.jobId;
            console.log("Job created:", jobId);

            // store it in localStorage (optional)
            localStorage.setItem("jobId", jobId);

            // redirect to results page
            navigate(`/results/${jobId}`);
        } catch (err) {
            console.error("Error:", err);
            alert("Failed to create job.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
            <h1>Submit Data</h1>
            <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                    padding: "10px 20px",
                    fontSize: "1.2rem",
                    backgroundColor: "#007bff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                }}
            >
                {loading ? "Processing..." : "Submit"}
            </button>
        </div>
    );
}
