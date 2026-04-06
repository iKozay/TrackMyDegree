import "../styles/components/InformationForm.css";
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
  firstTerm?: string;
  lastTerm?: string;
  isCoop?: boolean;
  isExtendedCreditProgram?: boolean;
  minimumProgramLength?: number;
}

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
  };

  const selectedDegree = degrees.find((d) => d._id === selectedDegreeId);

  const getDegreeSequenceFile = (degreeName: string, entryTerm: string): string | null => { // NOSONAR
    const name = degreeName.toLowerCase();

    // Aerospace is now selected as distinct concentrations.
    if (name.includes("aerospace")) {
      const optionMatch = /option\s*([abc])/i.exec(name);
      if (optionMatch?.[1]) {
        return `aerospace_option_${optionMatch[1].toLowerCase()}.json`;
      }

      if (name.includes("aerodynamics") || name.includes("propulsion")) {
        return "aerospace_option_a.json";
      }

      if (name.includes("structures") || name.includes("materials")) {
        return "aerospace_option_b.json";
      }

      if (name.includes("avionics") || name.includes("systems")) {
        return "aerospace_option_c.json";
      }

      return null;
    }

    // Handle Chemical with entry term
    if (name.includes("chemical")) {
      return entryTerm.toLowerCase() === "winter"
        ? "chemical_winter_entry.json"
        : "chemical_fall_entry.json";
    }

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

  const checkSequenceAvailability = (degreeName: string, entryTerm: string): boolean => {
    const name = degreeName.toLowerCase();
    const term = entryTerm.toLowerCase();

    if (name.includes("chemical")) {
      return term === "fall" || term === "winter";
    }

    return term === "fall";
  };

  const submitFormData = async (formData: ProgramInfo) => {
    const response = await api.post<UploadResponse>("/upload/form", formData);
    if (response?.jobId) {
      navigate(`/timeline/${response.jobId}`);
      return;
    }
    alert("Unexpected response from server.");
  };

  const handlePredefinedSequence = async (
    matched_degree: Degree,
    startingSemester: string,
  ): Promise<boolean> => {
    const sequenceFile = getDegreeSequenceFile(matched_degree.name, selectedTerm);
    if (!sequenceFile) {
      alert("No predefined sequence available for this degree.");
      return true; // handled, stop further processing
    }

    try {
      const response = await fetch(`/coop-sequences/${sequenceFile}`);
      if (!response.ok) {
        console.error(`Failed to load sequence: ${response.statusText}`);
        alert("Failed to load predefined sequence. Falling back to standard generation.");
        return false;
      }
      const sequenceData = await response.json();

      try {
        await submitFormData({
          degree: matched_degree._id,
          firstTerm: startingSemester,
          isCoop: true,
          isExtendedCreditProgram: selectedRadio.extendedCredit,
          predefinedSequence: sequenceData,
        });
        return true;
      } catch (apiError: unknown) {
        console.error("Error processing predefined sequence:", apiError);
        const message = apiError instanceof Error
          ? apiError.message
          : "An unknown error occurred while processing the predefined sequence.";
        alert(message);
        return true;
      }
    } catch (error) {
      console.error("Error loading predefined sequence:", error);
      alert("Failed to load predefined sequence. Falling back to standard generation.");
      return false; // fall through to standard generation
    }
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

    if (selectedRadio.coOp && loadPredefinedSequence && matched_degree) {
      const handled = await handlePredefinedSequence(matched_degree, startingSemester);
      if (handled) return;
    }

    try {
      await submitFormData({
        degree: matched_degree?._id ?? selectedDegreeId,
        firstTerm: startingSemester,
        isCoop: selectedRadio.coOp,
        isExtendedCreditProgram: selectedRadio.extendedCredit,
      });
    } catch (error: unknown) {
      console.error("Error processing form submission:", error);
      const message = error instanceof Error
        ? error.message
        : "An unknown error occurred while processing the form.";
      alert(message);
    }
  };

  return (
    <div className="form-wrapper">
      <h2>Manual Setup</h2>
      <p>
        Fill in your details to generate a personalized academic timeline.
      </p>
      <form>
        <div>
          <label htmlFor="degree-concentration">Degree Concentration</label>
          <select
            id="degree-concentration"
            className={`input-field ${selectedDegreeId ? "degree-selected" : ""}`}
            value={selectedDegreeId}
            onChange={(e) => setSelectedDegreeId(e.target.value)}>
            <option value="" disabled hidden>Select Degree</option>
            {degrees.length > 0 ? (
              degrees
                .toSorted((a, b) => a.name.localeCompare(b.name))
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
          <label htmlFor="starting-term">Starting Term</label>
          <select
            id="starting-term"
            className="input-field"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}>
            <option value="" disabled hidden>Select Term</option>
            <option value="Winter">Winter</option>
            <option value="Summer">Summer</option>
            <option value="Fall">Fall</option>
          </select>
        </div>

        <div>
          <label htmlFor="starting-year">Starting Year</label>
          <select
            id="starting-year"
            className="input-field"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}>
            <option value="" disabled hidden>Select Year</option>
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
          <span className="cooo">Extended Credit Program </span>
          <label>
            <input
              type="checkbox"
              name="extended-credit"
              value="yes"
              checked={selectedRadio.extendedCredit}
              onChange={() => handleRadioChange("extendedCredit", true)}
              aria-label="Extended Credit Program?"
            />
          </label>
        </div>

        <div className="radio-group">
          <span className="cooo">Co-op Program </span>
          <label>
            <input
              type="checkbox"
              name="co-op"
              value="yes"
              checked={selectedRadio.coOp}
              onChange={() => handleRadioChange("coOp", true)}
              aria-label="Co-op Program?"
            />
          </label>
        </div>

        {selectedRadio.coOp && selectedDegree && checkSequenceAvailability(selectedDegree.name, selectedTerm) && (
          <div className="radio-group">
            <span className="cooo">Load predefined co-op sequence? </span>
            <label>
              <input
                type="checkbox"
                name="load-predefined"
                value="yes"
                checked={loadPredefinedSequence}
                onChange={() => setLoadPredefinedSequence(!loadPredefinedSequence)}
                aria-label="Load predefined co-op sequence?"
              />
            </label>
          </div>
        )}
      </form>

      <button className="cancel-button" onClick={handleCancel}>
        Cancel
      </button>
      <button className="next-button" onClick={handleNextButtonClick} >
        Next
      </button>
    </div>
  );
};

export default InformationForm;
