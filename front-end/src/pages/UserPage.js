import React, { useState, useContext, useEffect  } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/UserPage.css";

const UserPage = () => {
  const { user, loading } = useContext(AuthContext); // Access user data from context
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState([
    { title: "Full Name", value: "Test Name" },
    { title: "Email", value: "testEmail@gmail.com" },
    { title: "Password", value: "123456" },
    { title: "Degree Concentration", value: "Software Man"},
  ]);
  if (user != null) {
    setUserInfo([
      { title: "Full Name", value: user.fullname },
      { title: "Email", value: user.email },
      { title: "Password", value: user.password },
      { title: "Degree Concentration", value: user.degree || "N/A"},
    ]);
  }

  // add way to get actual list here
  const degreeConcentrations = [
    "Software Engineer",
    "Data Scientist",
    "Cybersecurity Specialist",
    "AI Researcher",
    "Network Engineer",
  ];

  const [isEditing, setIsEditing] = useState(false);
  const [editedUserInfo, setEditedUserInfo] = useState(userInfo.map((item) => item.value));

  const startEditing = () => {
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedUserInfo(userInfo.map((item) => item.value));
    setIsEditing(false);
  };

  const saveChanges = () => {
    // add way to save changes here
    const updatedInfo = userInfo.map((item, index) => ({
      ...item,
      value: editedUserInfo[index],
    }));
    setUserInfo(updatedInfo);
    setIsEditing(false);
  };

  const handleInputChange = (e, index) => {
    const updatedValues = [...editedUserInfo];
    updatedValues[index] = e.target.value;
    setEditedUserInfo(updatedValues);
  };

  // add way to get user timelines here
  const [userTimelines, setUserTimelines] = useState([
    { id: 1, name: "Timeline 1", modifiedDate: "2025-01-10 10:12am" },
    { id: 2, name: "Timeline 2", modifiedDate: "2025-01-12 11:43am" },
    { id: 3, name: "Timeline 3", modifiedDate: "2025-01-14 1:03pm" },
  ]);
  const sortedUserTimelines = [...userTimelines].sort((a, b) => new Date(b.modifiedDate) - new Date(a.modifiedDate));

  const [showModal, setShowModal] = useState(false);
  const [timelineToDelete, setTimelineToDelete] = useState(null);

  const handleDeleteClick = (timeline) => {
    setTimelineToDelete(timeline);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setUserTimelines(userTimelines.filter((obj) => obj.id !== id));
    // add logic to actually delete here
  };

  // Redirect to login if no user is found
  useEffect(() => {
    //if (!user && !loading) {
    //  navigate("/signin");
    //}
  }, [user, loading, navigate]);

  if (!user) {
    //return null;
  }

  return (
    <div className="container-fluid">
      <div className="row vh-100">
        
        {/* Left Side */}
        <div className="col-12 col-md-4 d-flex flex-column align-items-center border-end text-center mx-auto">
          <h2 className="mb-4">My Profile</h2>
          <div className="d-flex flex-column mx-auto">
            {userInfo.map((item, index) => (
              <div
                key={index}
                className="userInfo-Box d-flex mb-2"
              >
                <span className="userinfo-title fw-bold">
                  {item.title}:
                </span>
                {isEditing && item.title === "Degree Concentration" ? (
                  <select
                    value={editedUserInfo[index]}
                    onChange={(e) => handleInputChange(e, index)}
                    className="form-select"
                  >
                    {degreeConcentrations.map((concentration, i) => (
                      <option key={i} value={concentration}>
                        {concentration}
                      </option>
                    ))}
                  </select>
                ) : isEditing ? (
                  <input
                    type="text"
                    className="form-control"
                    value={editedUserInfo[index]}
                    onChange={(e) => handleInputChange(e, index)}
                  />
                ) : (
                  <span>{item.value}</span>
                )}
              </div>
            ))}
          </div>
          {/* Edit, Cancel, and Save Buttons */}
          <div className="mt-4">
            {!isEditing ? (
              <button className="btn btn-success" onClick={startEditing}>
                Edit
              </button>
            ) : (
              <div className="d-flex gap-2">
                <button className="btn btn-secondary" onClick={cancelEditing}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={saveChanges}>
                  Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="col-12 col-md-6 d-flex flex-column text-center mx-auto mt-3 mt-md-0">
          <h2 className="mb-4">My Timelines</h2>
          {sortedUserTimelines.length === 0 ? (
            <Link to="/timeline_change">
            <p>You haven't saved any timelines yet, click here to start now!</p></Link>
          ) : (
          <div className="list-group">
            {sortedUserTimelines.map((obj) => (
            <div
              key={obj.id}
              className="timeline-box d-flex align-items-center justify-content-between"
            >
              <Link
                to="/timeline_change" // modify this link once timeline actually hooked up
                className = "timeline-link"
              >
                <span className="timeline-text">{obj.name}</span>
                <span className="timeline-text">
                  Last Modified: {obj.modifiedDate}
                </span>
              </Link>
              <button
                onClick={(e) => {
                  handleDeleteClick(obj);
                }}
                className="timeline-delete btn btn-danger btn-sm"
              >
                X
              </button>
            </div>
            ))}
          </div>)}
          {/* Add New Timeline Button */}
          <Link
            to="/timeline_change"
            className="timeline-add"
          >
            <span className="timeline-text">
              +
            </span>
          </Link>
        </div>
      </div>
      
      {/* popup */}
      {showModal && (
        <div
          className="modal fade show"
          tabIndex="-1"
          style={{ display: 'block' }}
          aria-labelledby="confirmationModalLabel"
          aria-hidden="false"
        >
          <div className="modal-dialog">
            <div className="popup-box modal-content">
              <div className="modal-header d-flex justify-content-center">
                <h5 className="modal-title" id="confirmationModalLabel">
                  Delete "{timelineToDelete?.name}"?
                </h5>
              </div>
              <div className="modal-footer d-flex justify-content-center">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => {
                    handleDelete(timelineToDelete);
                    setShowModal(false);
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default UserPage;