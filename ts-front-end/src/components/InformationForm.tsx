import "../styles/TimelineSetupPage.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/http-api-client.ts";

interface Degree {
  _id: string;
  name: string;
  totalCredits: number;
  coursePools?: string[];
}

interface SelectedRadio {
  coOp: boolean;
  extendedCredit: boolean;
}

export interface ProgramInfo extends Record<string, unknown> {
  degree: string;
  firstTerm?: string; // e.g., "Fall 2022"
  lastTerm?: string; // e.g., "Spring 2026"
  isCoop?: boolean;
  isExtendedCreditProgram?: boolean;
  minimumProgramLength?: number;
}

type JobResponse = {
  jobId: string;
  status: string;
};

const InformationForm = () => {
  const navigate = useNavigate();

  const [selectedDegreeId, setSelectedDegreeId] = useState<string>("");
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedRadio, setSelectedRadio] = useState<SelectedRadio>({
    coOp: false,
    extendedCredit: false,
  });

  // Fetch degrees on mount
  useEffect(() => {
    const getDegrees = async () => {
      try {
        const response = await api.get<Degree[]>("/degrees");
        setDegrees(response);
      } catch (err: unknown) {
        alert("Error fetching degrees from server. Please try again later.");

        console.error(err);
      }
    };
    getDegrees();
  }, []);

  const handleRadioChange = (group: keyof SelectedRadio, value: boolean) => {
    setSelectedRadio((prev) => ({
      ...prev,
      [group]: prev[group] === value ? null : value, // toggle
    }));
  };

  const handleCancel = () => {
    setSelectedDegreeId("");
    setSelectedTerm("");
    setSelectedYear("");
    setSelectedRadio({
      coOp: false,
      extendedCredit: false,
    });
  };

  const handleNextButtonClick = async () => {
    if (!selectedDegreeId) {
      alert("Please select a degree before continuing.");
      return;
    }

    if (!selectedTerm || !selectedYear) {
      alert("Please select both a term and a year for your starting semester.");
      return;
    }

    const startingSemester = `${selectedTerm} ${selectedYear}`;
    const matched_degree = degrees.find((d) => d._id === selectedDegreeId);

    const formData: ProgramInfo = {
      degree: matched_degree?._id || selectedDegreeId,
      firstTerm: startingSemester,
      isCoop: selectedRadio.coOp,
      isExtendedCreditProgram: selectedRadio.extendedCredit,
    };

    try {
      const response = await api.post<JobResponse>("/upload/form", formData);

      if (response?.jobId) {
        navigate(`/timeline/${response.jobId}`);
        return;
      }

      alert("Unexpected response from server.");
    } catch (error: unknown) {
      console.error("Error processing form submission:", error);
      const message =
        error instanceof Error
          ? error.message
          : "An unknown error occurred while processing the form.";
      alert(message);
    }
  };

  return (
    <div className="form-container-al">
      <h2>Required Information</h2>
      <p>
        Manually fill out the following information so we can help you create
        the perfect timeline
      </p>
      <form>
        <div>
          <label htmlFor="degree-concentration">Degree Concentration:</label>
          <select
            id="degree-concentration"
            className="input-field"
            value={selectedDegreeId}
            onChange={(e) => setSelectedDegreeId(e.target.value)}>
            <option value="">-- Select a Degree --</option>
            {degrees.length > 0 ? (
              degrees
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((degree) => (
                  <option key={degree._id} value={degree._id}>
                    {degree.name}
                  </option>
                ))
            ) : (
              <option value="" disabled>
                No degrees available
              </option>
            )}
          </select>
        </div>

        <div>
          <label htmlFor="starting-term">Starting Term:</label>
          <select
            id="starting-term"
            className="input-field"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}>
            <option value="">-- Select Term --</option>
            <option value="Winter">Winter</option>
            <option value="Summer">Summer</option>
            <option value="Fall">Fall</option>
          </select>
        </div>

        <div>
          <label htmlFor="starting-year">Starting Year:</label>
          <select
            id="starting-year"
            className="input-field"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}>
            <option value="">-- Select Year --</option>
            {Array.from({ length: 2031 - 2017 + 1 }).map((_, index) => {
              const year = 2017 + index;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>

        <div className="radio-group">
          <span className="cooo">Extended Credit Program? </span>
          <label>
            <input
              type="checkbox"
              name="extended-credit"
              value="yes"
              checked={selectedRadio.extendedCredit === true}
              onChange={() => handleRadioChange("extendedCredit", true)}
            />
          </label>
        </div>
      </form>

      <button className="cancel-button" onClick={handleCancel}>
        Cancel
      </button>
      <button onClick={handleNextButtonClick} className="next-button">
        Next
      </button>
    </div>
  );
};

export default InformationForm;
