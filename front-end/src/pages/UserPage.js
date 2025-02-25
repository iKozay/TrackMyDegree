import React, { useState, useContext, useEffect  } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/UserPage.css";

const UserPage = ({ onDataProcessed }) => {
  const { user } = useContext(AuthContext); // Access user data from context
  const [userInfo, setUserInfo] = useState([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedUserInfo, setEditedUserInfo] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setUserInfo([
        { title: "Full Name", value: user.fullname || "NULL" },
        { title: "Email", value: user.email || "NULL" },
        //{ title: "Password", value: user.password || "NULL" },
      ]);
    }
  }, [user]);

  useEffect(() => {
    if (userInfo) {
      setEditedUserInfo(userInfo.map((item) => item.value))
    }
  }, [userInfo]);

  const startEditing = () => {
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedUserInfo(userInfo.map((item) => item.value));
    setIsEditing(false);
  };

  const saveChanges = async () => {
    // add way to save changes here
    const updatedInfo = userInfo.map((item, index) => ({
      ...item,
      value: editedUserInfo[index],
    }));
    try {
      // Construct the payload
      const payload = {
        id: user.id,
        fullname: updatedInfo[0].value,
        email: updatedInfo[1].value,
        type: user.type
      };
  
      // Make the POST request to update user info
      const response = await fetch(`${process.env.REACT_APP_SERVER}/appUser/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
  
      if (response.ok) {
        console.log("User info updated successfully!");
        setUserInfo(updatedInfo);
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        console.error("Failed to update user info.", errorData);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating user info:", error);
      setIsEditing(false);
    }
  };

  const handleTimelineClick = (obj) => {
    const transcriptData = [];
    localStorage.setItem('Timeline_Name', JSON.stringify(obj.name));

    const degreeId = obj.degree_id;
    const items = obj.items;
    const creditsRequired = 120;

    items.forEach(item => {
      const season = item.season;
      const year = item.year;
      const courses = item.courses;
      if(courses.length > 0){
        courses.forEach(course=>{
          transcriptData.push({
            term: `${season} ${year}`,
            course: course,
            grade: 'A'
          });
        });
      };
    });

    onDataProcessed({
      transcriptData,
      degreeId,
      creditsRequired
    });
    console.log("Obj.Item", obj.items);
    console.log("Obj.degree_id:", obj.degree_id);
    console.log("time", transcriptData);
    navigate("/timeline_change");  // Navigate to the desired page
  };

  const handleInputChange = (e, index) => {
    const updatedValues = [...editedUserInfo];
    updatedValues[index] = e.target.value;
    setEditedUserInfo(updatedValues);
  };

  // add way to get user timelines here
  const [userTimelines, setUserTimelines] = useState([]);

  useEffect(() => {
    if (user) {
      const getTimelines = async () => {
        const user_id = user.id;
        try {
          const response = await fetch(`${process.env.REACT_APP_SERVER}/timeline/getAll`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({user_id}),
          });
    
          if (!response.ok) {
            // Extract error message from response
            const errorData = await response.json();
            console.log(response);
            throw new Error(errorData.message || "Failed to fetch user timelines.");
          }
    
          const data = await response.json();
    
          // Sort by modified date in descending order
          const sortedTimelines = data.sort(
            (a, b) => new Date(b.last_modified) - new Date(a.last_modified)
          );
    
          setUserTimelines(sortedTimelines);
        } catch (e) {
          console.error("Error updating user info:", e);
        }
      }
    
      getTimelines();
    }
  }, [user] );

  const [showModal, setShowModal] = useState(false);
  const [timelineToDelete, setTimelineToDelete] = useState(null);

  const handleDeleteClick = (timeline) => {
    setTimelineToDelete(timeline);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    try {
      // delete timeline
      const response = await fetch(`${process.env.REACT_APP_SERVER}/timeline/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({id}),
      });

      if (!response.ok) {
        // Extract error message from response
        const errorData = await response.json();
        console.log(response);
        throw new Error(errorData.message || "Failed to delete user timelines.");
      }
      // remove from page
      setUserTimelines(userTimelines.filter((obj) => obj.id !== id));
    } catch (e) {
      console.error("Error deleting user timeline:", e);
    }
  };

  // Redirect to login if no user is found
  useEffect(() => {
    if (!user) {
      navigate("/signin");
    }
  }, [user, navigate]);

  if (!user) {
    return null;
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
                <span>{item.value}</span>
                {/*{isEditing && item.title === "Degree Concentration" ? (
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
                )}*/}  
              </div>
            ))}
          </div>
          {/* Edit, Cancel, and Save Buttons */}
          {/*<div className="mt-4">
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
          </div>*/}
        </div>

        {/* Right Side */}
        <div className="col-12 col-md-6 d-flex flex-column text-center mx-auto mt-3 mt-md-0">
          <h2 className="mb-4">My Timelines</h2>
          {userTimelines.length === 0 ? (
            <Link to="/timeline_initial">
            <p>You haven't saved any timelines yet, click here to start now!</p></Link>
          ) : (
          <div className="list-group">
            {userTimelines.map((obj) => (
            <div
              key={obj.id}
              className="timeline-box d-flex align-items-center justify-content-between"
            >
              <span
                    className="timeline-link"
                    // onClick={() => {
                    //   onDataProcessed({ timelineData: obj }); // Send the timeline data
                    //   navigate("/timeline_change");
                    // }}
                    onClick={() => handleTimelineClick(obj)} 
                  >
                <span className="timeline-text">{obj.name}</span>
                <span className="timeline-text">
                  Last Modified: {obj.last_modified}
                </span>
                </span>
              <button
                onClick={() => {
                  handleDeleteClick(obj);
                }}
                className="timeline-delete btn btn-danger btn-sm"
              >
                X
              </button>
            </div>
            ))}
            {/* Add New Timeline Button */}
            <Link
              to="/timeline_initial"
              className="timeline-add"
            >
              <span className="timeline-text">
                +
              </span>
            </Link>
          </div>)}
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
                    handleDelete(timelineToDelete.timeline_id);
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