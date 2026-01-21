import "../styles/TimelineSetupPage.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/http-api-client.ts";
import type { UploadResponse } from "../types/response.types.ts";

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

// const NODE_ENV = ENV.NODE_ENV || 'development';
const NODE_ENV = 'production';

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
  const [loadPredefinedSequence, setLoadPredefinedSequence] = useState<boolean>(false);
  const [aerospaceOption, setAerospaceOption] = useState<string>("");

  // Fetch degrees on mount
  useEffect(() => {
    const getDegrees = async () => {
      try {
        const response = await api.get<Degree[]>("/degree");
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
    setLoadPredefinedSequence(false);
    setAerospaceOption("");
  };

  // Check if selected degree is Aerospace
  const selectedDegree = degrees.find((d) => d._id === selectedDegreeId);
  const isAerospace = selectedDegree?.name?.toLowerCase().includes("aerospace") ?? false;

  // Map degree names to their sequence file names
  const getDegreeSequenceFile = (degreeName: string, entryTerm: string): string | null => {
    const name = degreeName.toLowerCase();

    // Handle Aerospace with options
    if (name.includes("aerospace")) {
      if (!aerospaceOption) return null;
      return `aerospace_${aerospaceOption}.json`;
    }

    // Handle Chemical with entry term
    if (name.includes("chemical")) {
      return entryTerm.toLowerCase() === "winter"
        ? "chemical_winter_entry.json"
        : "chemical_fall_entry.json";
    }

    // Map other degrees
    if (name.includes("building")) return "building_engineering.json";
    if (name.includes("civil")) return "civil_engineering.json";
    if (name.includes("computer") && name.includes("engineering")) return "computer_engineering.json";
    if (name.includes("computer") && name.includes("science")) return "computer_science.json";
    if (name.includes("electrical")) return "electrical_engineering.json";
    if (name.includes("industrial")) return "industrial_engineering.json";
    if (name.includes("mechanical")) return "mechanical_engineering.json";
    if (name.includes("software")) return "software_engineering.json";

    return null;
  };

  // Calculate empty terms to prepend based on entry term
  // All sequences assume Fall start. If user starts in Winter or Summer, add empty terms.
  const getEmptyTermsCount = (entryTerm: string, degreeName: string): number => {
    // Chemical has specific sequences for each entry, no padding needed
    if (degreeName.toLowerCase().includes("chemical")) return 0;

    // For other programs: Fall = 0 empty terms, Winter = 2, Summer = 1
    if (entryTerm === "Fall") return 0;
    if (entryTerm === "Winter") return 2; // Winter (empty) + Summer (empty)
    if (entryTerm === "Summer") return 1; // Summer (empty)
    return 0;
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

    // Handle predefined sequence loading
    if (selectedRadio.coOp && loadPredefinedSequence && matched_degree) {
      // Validation for Aerospace
      if (isAerospace && !aerospaceOption) {
        alert("Please select an Aerospace option.");
        return;
      }

      const sequenceFile = getDegreeSequenceFile(matched_degree.name, selectedTerm);

      if (!sequenceFile) {
        alert("No predefined sequence available for this degree.");
        return;
      }

      try {
        // Fetch the sequence from public folder
        const response = await fetch(`/coop-sequences/${sequenceFile}`);
        if (!response.ok) {
          throw new Error(`Failed to load sequence: ${response.statusText}`);
        }

        const sequenceData = await response.json();

        // Calculate empty terms to prepend
        const emptyTermsCount = getEmptyTermsCount(selectedTerm, matched_degree.name);

        // Prepend empty terms if needed
        const emptyTerms = Array.from({ length: emptyTermsCount }, () => ({
          type: "Academic",
          courses: []
        }));

        const adjustedSequence = [...emptyTerms, ...sequenceData];

        // Send the predefined sequence to backend for processing
        const formDataWithSequence: ProgramInfo = {
          degree: matched_degree._id,
          firstTerm: startingSemester,
          isCoop: true,
          isExtendedCreditProgram: selectedRadio.extendedCredit,
          predefinedSequence: adjustedSequence,
        };

        try {
          const apiResponse = await api.post<UploadResponse>("/upload/form", formDataWithSequence);

          if (apiResponse?.jobId) {
            navigate(`/timeline/${apiResponse.jobId}`);
            return;
          }

          alert("Unexpected response from server.");
        } catch (apiError: unknown) {
          console.error("Error processing predefined sequence:", apiError);
          const message =
            apiError instanceof Error
              ? apiError.message
              : "An unknown error occurred while processing the predefined sequence.";
          alert(message);
        }
        return;
      } catch (error) {
        console.error("Error loading predefined sequence:", error);
        alert("Failed to load predefined sequence. Falling back to standard generation.");
      }
    }

    // Standard flow - send to backend
    const formData: ProgramInfo = {
      degree: matched_degree?._id || selectedDegreeId,
      firstTerm: startingSemester,
      isCoop: selectedRadio.coOp,
      isExtendedCreditProgram: selectedRadio.extendedCredit,
    };

    try {
      const response = await api.post<UploadResponse>("/upload/form", formData);

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

        {NODE_ENV !== 'production' && <div className="radio-group">
          <span className="cooo">Co-op Program? </span>
          <label>
            <input
              type="checkbox"
              name="co-op"
              value="yes"
              checked={selectedRadio.coOp === true}
              onChange={() => handleRadioChange("coOp", true)}
            />
          </label>
        </div>}

        {selectedRadio.coOp && (
          <div className="radio-group">
            <span className="cooo">Load predefined co-op sequence? </span>
            <label>
              <input
                type="checkbox"
                name="load-predefined"
                value="yes"
                checked={loadPredefinedSequence}
                onChange={() => setLoadPredefinedSequence(!loadPredefinedSequence)}
              />
            </label>
          </div>
        )}

        {selectedRadio.coOp && loadPredefinedSequence && isAerospace && (
          <div>
            <label htmlFor="aerospace-option">Select Aerospace Option:</label>
            <select
              id="aerospace-option"
              className="input-field"
              value={aerospaceOption}
              onChange={(e) => setAerospaceOption(e.target.value)}>
              <option value="">-- Select Option --</option>
              <option value="option_a">Option A - Aerodynamics and Propulsion</option>
              <option value="option_b">Option B - Structures and Materials</option>
              <option value="option_c">Option C - Avionics & Aerospace Systems</option>
            </select>
          </div>
        )}
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
