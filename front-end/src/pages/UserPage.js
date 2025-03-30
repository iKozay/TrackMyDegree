// src/pages/UserPage.js
import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../middleware/AuthContext';
import moment from 'moment';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/UserPage.css';
import { motion } from 'framer-motion';

// === Updated imports for your custom modal & trash icon ===
import DeleteModal from '../components/DeleteModal';
import TrashLogo from '../icons/trashlogo'; // Adjust path if needed
import { UserPageError } from '../middleware/SentryErrors';

const UserPage = ({ onDataProcessed }) => {
  const { user } = useContext(AuthContext);
  const [userInfo, setUserInfo] = useState([]);

  // Commented out edit modde code
  //const [isEditing, setIsEditing] = useState(false);
  //const [editedUserInfo, setEditedUserInfo] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setUserInfo([
        { title: 'Full Name', value: user.fullname || 'NULL' },
        { title: 'Email', value: user.email || 'NULL' }
      ]);
    }
  }, [user]);


  const handleTimelineClick = (obj) => {
    const transcriptData = [];
    localStorage.setItem('Timeline_Name', JSON.stringify(obj.name));

    const degreeId = obj.degree_id;
    const items = obj.items;
    const creditsRequired = 120;
    const isExtendedCredit = obj.isExtendedCredit;

    items.forEach((item) => {
      const { season, year, courses } = item;
      transcriptData.push({
        term: `${season} ${year}`,
        courses: courses,
        grade: 'A',
      });
    });

    console.log('isExtendedCredit user page', isExtendedCredit);

    onDataProcessed({
      transcriptData,
      degreeId,
      creditsRequired,
      isExtendedCredit,
    });
    localStorage.setItem('Timeline_Name', obj.name);
    navigate('/timeline_change');
  };

  // add way to get user timelines here
  const [userTimelines, setUserTimelines] = useState([]);

  useEffect(() => {
    if (user.type === "student") {
      const getTimelines = async () => {
        const user_id = user.id;
        try {
          const response = await fetch(
            `${process.env.REACT_APP_SERVER}/timeline/getAll`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ user_id }),
            },
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new UserPageError(
              errorData.message || 'Failed to fetch user timelines.',
            );
          }

          const data = await response.json();

          if (Array.isArray(data)) {
            // Sort by modified date in descending order
            const sortedTimelines = data.sort(
              (a, b) => new Date(b.last_modified) - new Date(a.last_modified),
            );

            setUserTimelines(sortedTimelines);
          } else {
            setUserTimelines([]);
          }
        } catch (e) {
          console.error('Error updating user info:', e);
        }
      };

      getTimelines();
    }
  }, [user]);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [timelineToDelete, setTimelineToDelete] = useState(null);

  const handleDeleteClick = (timeline) => {
    setTimelineToDelete(timeline);
    setShowModal(true);
  };

  const handleDelete = async (timeline_id) => {
    try {
      // delete timeline
      const response = await fetch(
        `${process.env.REACT_APP_SERVER}/timeline/delete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ timeline_id }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new UserPageError(
          errorData.message || 'Failed to delete user timeline.',
        );
      }
      // remove from page
      setUserTimelines(userTimelines.filter((obj) => obj.id !== timeline_id));
    } catch (e) {
      console.error('Error deleting user timeline:', e);
    }
  };

  // Redirect to login if no user is found
  useEffect(() => {
    if (!user) {
      navigate('/signin');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <div className="container-fluid">
        <div className="row vh-100">
          <div className="col-12 col-md-4 d-flex flex-column align-items-center text-center mx-auto">
            <h2 className="mb-4">My Profile</h2>
            <div className="profile-container d-flex">
              <div className="max-w-sm w-full">
                {' '}
                {/* Changed from max-w-xs to max-w-sm */}
                <div className="bg-white shadow-xl rounded-lg py-4">
                  {' '}
                  {/* Increased padding */}
                  <div className="photo-wrapper p-3">
                    {' '}
                    {/* Increased padding */}
                    <img
                      className="w-40 h-40 rounded-full mx-auto"
                      src="https://www.svgrepo.com/download/374554/avatar-loading.svg" //replace when upload available
                      alt="Profile Avatar"
                    />
                  </div>
                  <div className="p-3">
                    {' '}
                    {/* Increased padding */}
                    <h3 className="text-center text-2xl text-gray-900 font-medium leading-8">
                      {' '}
                      {/* Increased text size */}
                      {user.fullname || 'Full Name'}
                    </h3>
                    <div className="text-center text-gray-400 text-sm font-semibold">
                      {' '}
                      {/* Increased text size */}
                      <p>{user.type || 'User'}</p>
                    </div>
                    <table className="text-sm my-4">
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 text-gray-500 font-semibold">
                            Full Name
                          </td>
                          <td className="px-3 py-2">
                            {user.fullname || 'NULL'}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-gray-500 font-semibold">
                            Email
                          </td>
                          <td className="px-3 py-2">
                            {user.email || 'NULL'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {/* Separator Line */}
              <div className="separator-line"></div>
            </div>
          </div>
          {/* Right Side - My Timelines (Unchanged) */}
          <div className="col-12 col-md-6 d-flex flex-column text-center mx-auto mt-3 mt-md-0">
            <h2 className="mb-5">My Timelines</h2>
            {userTimelines.length === 0 ? (
              <Link to="/timeline_initial">
                <p>
                  You haven't saved any timelines yet, click here to start now!
                </p>
              </Link>
            ) : (
              <div className="list-group">
                {userTimelines.map((obj) => (
                  <div
                    key={obj.id}
                    className="timeline-box d-flex align-items-center justify-content-between"
                  >
                    <span
                      className="timeline-link"
                      onClick={() => handleTimelineClick(obj)}
                    >
                      <span className="timeline-text">{obj.name}</span>
                      <span className="timeline-text">
                        Last Modified:{' '}
                        {moment(obj.last_modified).format(
                          'MMM DD, YYYY h:mm A',
                        )}
                      </span>
                    </span>
                    <button
                      onClick={() => handleDeleteClick(obj)}
                      className="timeline-delete btn btn-lg p-0 border-0 bg-transparent"
                    >
                      <TrashLogo size={25} className="me-1 text-danger" />{' '}
                      {/* Added text-danger for red icon */}
                    </button>
                  </div>
                ))}
                {/* Add New Timeline Button */}
                <Link to="/timeline_initial" className="timeline-add">
                  <span className="timeline-text">+</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirm Modal */}
        <DeleteModal open={showModal} onClose={() => setShowModal(false)}>
          <div className="tw-text-center tw-w-56">
            <TrashLogo size={56} className="tw-mx-auto tw-text-red-500" />
            <div className="tw-mx-auto tw-my-4 tw-w-48">
              <h3 className="tw-text-lg tw-font-black tw-text-gray-800">
                Confirm Delete
              </h3>
              <p className="tw-text-sm tw-text-gray-500">
                Are you sure you want to delete "{timelineToDelete?.name}"?
              </p>
            </div>
            <div className="tw-flex tw-gap-4">
              <button
                className="btn btn-danger tw-w-full"
                onClick={() => {
                  handleDelete(timelineToDelete?.id);
                  setShowModal(false);
                }}
              >
                Delete
              </button>
              <button
                className="btn btn-light tw-w-full"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </DeleteModal>
      </div>
    </motion.div>
  );
};

export default UserPage;




 //! Commented out edit modde code
  /*useEffect(() => {
    if (userInfo) {
      setEditedUserInfo(userInfo.map((item) => item.value));
    }
  }, [userInfo]);*/

  /*const startEditing = () => {
    setIsEditing(true);
  };*/

  /*const cancelEditing = () => {
    setEditedUserInfo(userInfo.map((item) => item.value));
    setIsEditing(false);
  };*/

  /*const saveChanges = async () => {
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
        type: user.type,
      };

      // Make the POST request to update user info
      const response = await fetch(
        `${process.env.REACT_APP_SERVER}/appUser/update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

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
  };*/


  //! Commented out edit modde code
  /*const handleInputChange = (e, index) => {
    const updatedValues = [...editedUserInfo];
    updatedValues[index] = e.target.value;
    setEditedUserInfo(updatedValues);
  };*/