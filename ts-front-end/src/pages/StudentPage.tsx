import React, { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/http-api-client";
import LegacyStudentPage from "../legacy/pages/UserPage.jsx";
import { useNavigate } from "react-router-dom";

// TODO: extract fetch logic into a custom hook (e.g. useStudentData)
// to keep this component focused on rendering only

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
    // Check for redirect path — only allow same-origin relative paths to prevent open redirect (CWE-601)
    const redirect = localStorage.getItem("redirectAfterLogin");
    localStorage.removeItem("redirectAfterLogin");
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      navigate(redirect, { replace: true });
    }

    const fetchUserTimelines = async () => {
      try {
        if (user?.id) {
          const data = await api.get<UserTimelinesResponse>(
            `/users/${user.id}/data`
          );

          setTimelines(data.timelines);
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
