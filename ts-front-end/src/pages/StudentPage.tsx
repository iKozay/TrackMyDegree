import React, { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/http-api-client";
import LegacyStudentPage from "../legacy/pages/UserPage.jsx";
import { useNavigate } from "react-router-dom";

// TODO: Define a proper Timeline type based on actual data structure
// interface Timeline {
//   last_modified: string;
//   [key: string]: unknown;
// }
export interface Timeline {
  _id: string;
  name: string;
  degreeId: string;
  isCoop: boolean;
  isExtendedCredit: boolean;
}

interface UserTimelinesResponse {
  user: {
    _id: string;
    email: string;
    fullname: string;
    type: string;
  };
  timelines: Timeline[];
}
const StudentPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [timelines, setTimelines] = React.useState<Timeline[]>([]);
  useEffect(() => {
    if (!isAuthenticated) return;
    // Check for redirect path
    const redirect = localStorage.getItem("redirectAfterLogin");
    localStorage.removeItem("redirectAfterLogin");
    if (redirect) navigate(redirect, { replace: true });

    const fetchUserTimelines = async () => {
      try {
        if (user?.id) {
          const data = await api.get<UserTimelinesResponse>(
            `/users/${user.id}/data`
          );

          setTimelines(data.timelines);
          // if (Array.isArray(fetchedTimelines)) {
          //   // Sort timelines by last_modified in descending order (TypeScript safe)
          //   const sortedTimelines = [...fetchedTimelines].sort(
          //     (a: { last_modified: string }, b: { last_modified: string }) => {
          //       const dateA = new Date(a.last_modified).getTime();
          //       const dateB = new Date(b.last_modified).getTime();
          //       return dateB - dateA;
          //     }
          //   );
          //   setTimelines(sortedTimelines);
          // }
        }
      } catch (err) {
        console.error(err);
      } finally {
        //
      }
    };

    fetchUserTimelines();
  }, [isAuthenticated, navigate, user]);

  if (!isAuthenticated) {
    return <p>Please log in to see your data.</p>;
  }

  return <LegacyStudentPage student={user} timelines={timelines} />;
};

export default StudentPage;
