import '../css/UploadAcceptanceLetter.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

//TODO: add checkboxes for coop and credit deficiency(there is only extended credit program)
const InformationForm = ({ degrees }) => {
  const [selectedDegreeId, setSelectedDegreeId] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const navigate = useNavigate();
  const [selectedRadio, setSelectedRadio] = useState({
    coOp: null,
    extendedCredit: null,
    creditDeficiency: null,
  });

  const handleRadioChange = (group, value) => {
    setSelectedRadio((prev) => ({
      ...prev,
      [group]: prev[group] === value ? null : value, // Toggle selection. If clicked twice it's deselected
    }));
  };
  const handleCancel = () => {
    setSelectedDegreeId('');
    setSelectedTerm('');
    setSelectedYear('');
    setSelectedRadio({
      coOp: null,
      extendedCredit: null,
      creditDeficiency: null,
    });
  };
  // Navigate on Next button click, passing the selected degree and combined starting semester
  const handleNextButtonClick = () => {
    // Example check to ensure something is selected:
    if (!selectedDegreeId) {
      alert('Please select a degree before continuing.');
      return;
    }

    if (!selectedTerm || !selectedYear) {
      alert('Please select both a term and a year for your starting semester.');
      return;
    }
    const startingSemester = `${selectedTerm} ${selectedYear}`;

    const matched_degree = degrees.find((d) => d.id === selectedDegreeId);
    const credits_Required = matched_degree.totalCredits;

    // Pass the selectedDegreeId, creditsRequired, and startingSemester to the timeline page
    localStorage.setItem('Timeline_Name', null);

    console.log('select: ', selectedRadio.extendedCredit);
    navigate('/timeline_change', {
      state: {
        degree_Id: selectedDegreeId,
        startingSemester: startingSemester,
        coOp: selectedRadio.coOp,
        credits_Required: credits_Required,
        extendedCredit: selectedRadio.extendedCredit,
        creditDeficiency: selectedRadio.creditDeficiency,
      },
    });
  };

  return (
    <div className="form-container-al">
      <h2>Required Information</h2>
      <p>Manually fill out the following information so we can help you create the perfect timeline</p>
      <form>
        <div>
          <label htmlFor="degree-concentration">Degree Concentration:</label>
          <select
            id="degree-concentration"
            className="input-field"
            value={selectedDegreeId}
            onChange={(e) => {
              setSelectedDegreeId(e.target.value);
            }}
          >
            <option value="">-- Select a Degree --</option>
            {degrees && degrees.length > 0 ? (
              degrees
                .sort((a, b) => a.name.localeCompare(b.name)) // Sort degrees alphabetically by name
                .map((degree) => (
                  <option key={degree.id} value={degree.id}>
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
          <div>
            <label htmlFor="starting-term">Starting Term:</label>
            <select
              id="starting-term"
              className="input-field"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
            >
              <option value="">-- Select Term --</option>
              <option value="Winter">Winter</option>
              <option value="Summer">Summer</option>
              <option value="Fall">Fall</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="starting-year">Starting Year:</label>
          <select
            id="starting-year"
            className="input-field"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {/*TODO: update years dynamically  */}
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
              onChange={() => handleRadioChange('extendedCredit', true)}
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
