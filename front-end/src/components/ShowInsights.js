/* eslint-disable prettier/prettier */
import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Legend } from 'recharts';

const ShowInsights = ({
  coursePools,
  semesterCourses,
  creditsRequired: creditsRequiredProp,
  deficiencyCredits,
  courseInstanceMap = {},
}) => {
  console.log('ShowInsights Props:');
  console.log('coursePools:', coursePools);
  console.log('semesterCourses:', semesterCourses);
  console.log('creditsRequiredProp:', creditsRequiredProp);
  console.log('deficiencyCredits:', deficiencyCredits);
  console.log('courseInstanceMap:', courseInstanceMap);

  if (!courseInstanceMap) {
    console.warn('courseInstanceMap is undefined or not passed to ShowInsights');
  }

  const [showInsights, setShowInsights] = useState(false);
  const [tooltipData, setTooltipData] = useState({});
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [tooltipVisibility, setTooltipVisibility] = useState({});
  const [animationActive, setAnimationActive] = useState(true);

  useEffect(() => {
    setAnimationActive(true);
    const timer = setTimeout(() => {
      setAnimationActive(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [showInsights]);

  const parseMaxCreditsFromPoolName = (poolName, poolCourses) => {
    const match = poolName.match(/\((\d+(\.\d+)?)\s*credits\)/);
    if (match) {
      return parseFloat(match[1]);
    }
    const totalPoolCredits = poolCourses
      .map((course) => course.credits || 0)
      .reduce((sum, credits) => sum + credits, 0);
    console.warn(`Could not parse max credits from pool name "${poolName}". Using total pool credits: ${totalPoolCredits}`);
    return totalPoolCredits;
  };

  const calculatedCreditsRequired = useMemo(() => {
    return coursePools.reduce((sum, pool) => {
      const maxCredits = parseMaxCreditsFromPoolName(pool.poolName, pool.courses);
      return sum + maxCredits;
    }, 0);
  }, [coursePools]);

  console.log('Calculated creditsRequired from coursePools:', calculatedCreditsRequired);

  const calculateTotalCredits = () => {
    const poolCreditMap = {};

    coursePools.forEach((pool) => {
      poolCreditMap[pool.poolId] = {
        assigned: 0,
        max: parseMaxCreditsFromPoolName(pool.poolName, pool.courses),
      };
    });

    console.log('Initialized poolCreditMap:', poolCreditMap);

    const semesterOrder = Object.keys(semesterCourses)
      .filter((semesterId) => semesterId.toLowerCase() !== 'exempted')
      .sort((a, b) => a.localeCompare(b));

    const lastOccurrence = {};
    semesterOrder.forEach((semesterId, index) => {
      const courseInstances = semesterCourses[semesterId] || [];
      courseInstances.forEach((instanceId) => {
        const genericCode = courseInstanceMap[instanceId] || instanceId;
        lastOccurrence[genericCode] = index;
      });
    });

    semesterOrder.forEach((semesterId, currentSemesterIndex) => {
      const courseCodes = semesterCourses[semesterId] || [];
      courseCodes.forEach((instanceId) => {
        const genericCode = courseInstanceMap[instanceId] || instanceId;
        if (currentSemesterIndex !== lastOccurrence[genericCode]) {
          return;
        }

        const pool = coursePools.find((p) =>
          p.courses.some((c) => c.code === genericCode),
        );

        if (!pool) return;

        const course = pool.courses.find((c) => c.code === genericCode);
        if (!course) return;

        const poolData = poolCreditMap[pool.poolId];
        const newSum = poolData.assigned + (course.credits || 0);
        poolData.assigned = Math.min(poolData.max, newSum);
        console.log(`Added ${course.credits} credits for ${genericCode} to pool ${pool.poolId}. New assigned: ${poolData.assigned}`);
      });
    });

    const total = Object.values(poolCreditMap).reduce(
      (sum, poolData) => sum + poolData.assigned,
      0,
    );

    console.log('Final poolCreditMap:', poolCreditMap);
    console.log('Total credits calculated:', total);

    return total;
  };

  const totalCredits = useMemo(() => {
    return calculateTotalCredits();
  }, [semesterCourses, coursePools, courseInstanceMap]);

  const calculatePoolProgress = () => {
    return coursePools.map((pool) => {
      const allAssignedInstanceIds = Object.entries(semesterCourses)
        .filter(([semesterId]) => semesterId.toLowerCase() !== 'exempted')
        .flatMap(([, instanceIds]) => instanceIds);

      const assignedGenericCodes = allAssignedInstanceIds.map((instanceId) => {
        const genericCode = courseInstanceMap[instanceId] || instanceId;
        return genericCode;
      });

      const assignedCourses = assignedGenericCodes.filter((cCode) =>
        pool.courses.some((c) => c.code === cCode),
      );

      const assignedCredits = assignedCourses
        .map((cCode) => {
          const courseInPool = pool.courses.find((c) => c.code === cCode);
          return courseInPool ? courseInPool.credits : 0;
        })
        .reduce((sum, c) => sum + c, 0);

      const maxCredits = parseMaxCreditsFromPoolName(pool.poolName, pool.courses);
      const remainingCredits = Math.max(0, maxCredits - assignedCredits);

      const remainingCoursesInPool = pool.courses
        .filter((course) => !assignedCourses.includes(course.code))
        .map((course) => course.code);

      return {
        poolName: pool.poolName,
        data: [
          {
            name: "Completed",
            value: assignedCredits,
            courses: assignedCourses,
          },
          {
            name: "Remaining",
            value: remainingCredits,
            courses: remainingCoursesInPool,
          },
        ],
        maxCredits: maxCredits,
      };
    });
  };

  const calculateTotalCreditsProgress = () => {
    const totalAssigned = totalCredits;
    const totalRequired = calculatedCreditsRequired + deficiencyCredits;

    console.log('calculateTotalCreditsProgress:');
    console.log('totalAssigned:', totalAssigned);
    console.log('totalRequired:', totalRequired);

    if (totalRequired === 0) {
      console.warn('totalRequired is 0; creditsRequired could not be calculated from coursePools');
      return [
        { name: "Completed", value: 0, courses: [] },
        { name: "Remaining", value: 1, courses: [] },
      ];
    }

    const assignedCourses = Object.keys(semesterCourses)
      .filter((semesterId) => semesterId.toLowerCase() !== "exempted")
      .flatMap((semesterId) =>
        semesterCourses[semesterId].map((instanceId) => courseInstanceMap[instanceId] || instanceId)
      );

    const allPoolCourses = coursePools.flatMap((pool) =>
      pool.courses.map((course) => course.code)
    );

    const remainingCourses = allPoolCourses.filter(
      (courseCode) => !assignedCourses.includes(courseCode)
    );

    const remainingCredits = Math.max(0, totalRequired - totalAssigned);
    console.log('remainingCredits:', remainingCredits);

    return [
      {
        name: "Completed",
        value: totalAssigned,
        courses: assignedCourses,
      },
      {
        name: "Remaining",
        value: remainingCredits,
        courses: remainingCourses,
      },
    ];
  };

  const CustomTooltip = ({ onClose, isVisible, chartId, data }) => {
    const [visibleCourses, setVisibleCourses] = useState(20);

    if (!isVisible || !data) return null;

    const { name, value, courses = [] } = data;
    const hasMoreCourses = courses.length > visibleCourses;
    const displayedCourses = courses.slice(0, visibleCourses);

    return (
      <div className="custom-tooltip" onClick={(e) => e.stopPropagation()}>
        <button className="tooltip-close-button" onClick={onClose}>✕</button>
        <p className="tooltip-title">{`${name}: ${value} credits`}</p>
        {courses.length > 0 ? (
          <div>
            <p className="tooltip-subtitle">Courses:</p>
            <ul className="tooltip-course-list">
              {displayedCourses.map((course, index) => (
                <li key={index}>{course}</li>
              ))}
              {hasMoreCourses && (
                <li className="tooltip-more-indicator">
                  ...and {courses.length - visibleCourses} more
                  <button
                    className="tooltip-load-more"
                    onClick={() => setVisibleCourses((prev) => prev + 20)}
                  >
                    Load More
                  </button>
                </li>
              )}
            </ul>
          </div>
        ) : (
          <p className="tooltip-empty">No courses</p>
        )}
      </div>
    );
  };

  const toggleTooltipVisibility = (chartId, segment, visible, data) => {
    if (visible === false && !data) {
      setTooltipVisibility((prev) => ({
        ...prev,
        [chartId]: { visible: false },
      }));
      return;
    }

    setTooltipVisibility((prev) => ({
      ...prev,
      [chartId]: { segment, visible: true },
    }));

    setTooltipData((prev) => ({
      ...prev,
      [chartId]: data,
    }));
  };

  return (
    <div>
      <button
        className="toggle-insights-btn"
        onClick={() => setShowInsights(true)}
      >
        Show Insights
      </button>

      {showInsights && (
        <div className="modal-overlay">
          <div className="modal-card">
            <button
              className="modal-close-button"
              onClick={() => setShowInsights(false)}
            >
              ✕
            </button>
            <div className="insights-section">
              <h2>Progress Insights</h2>
              <hr style={{ marginBottom: '1rem' }} />

              <h5>Course Pool Progress</h5>
              <div className="course-pool-charts">
                {calculatePoolProgress().map((pool, index) => {
                  const chartId = `pool-${index}`;
                  const isTooltipVisible = activeTooltip === chartId;
                  const currentTooltipData = tooltipData[chartId];

                  return (
                    <div key={index} className="chart-container" style={{ minWidth: '250px' }}>
                      <h6>{pool.poolName}</h6>
                      <PieChart width={500} height={200} margin={{ right: 50, left: 20 }}>
                        <Pie
                          data={pool.data}
                          cx="50%"
                          cy="50%"
                          innerRadius={120}
                          outerRadius={250}
                          fill="#8884d8"
                          dataKey="value"
                          labelLine={false}
                          label={(props) => {
                            const { cx, cy, midAngle, innerRadius, outerRadius, value } = props;
                            const RADIAN = Math.PI / 180;
                            const radius = 260;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            const percent = (value / pool.maxCredits) * 100;

                            return (
                              <text
                                x={x}
                                y={y}
                                fill="#333"
                                textAnchor={x > cx ? "start" : "end"}
                                dominantBaseline="central"
                                style={{ fontSize: '35px', fontWeight: 'bold' }}
                              >
                                {`${percent.toFixed(0)}%`}
                              </text>
                            );
                          }}
                          isAnimationActive={animationActive}
                          isUpdateAnimationActive={false}
                        >
                          {pool.data.map((entry, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={entry.name === "Completed" ? "#4a90e2" : "#d3d3d3"}
                              onMouseEnter={() => {
                                toggleTooltipVisibility(chartId, entry.name, true, {
                                  name: entry.name,
                                  value: entry.value,
                                  courses: entry.courses,
                                });
                                setActiveTooltip(chartId);
                              }}
                            />
                          ))}
                        </Pie>
                      </PieChart>

                      {isTooltipVisible && (
                        <div className="tooltip-wrapper">
                          <CustomTooltip
                            onClose={() => {
                              toggleTooltipVisibility(chartId, null, false, null);
                              setActiveTooltip(null);
                            }}
                            isVisible={isTooltipVisible}
                            chartId={chartId}
                            data={currentTooltipData}
                          />
                        </div>
                      )}

                      <p>{pool.data[0].value} / {pool.maxCredits} credits</p>
                    </div>
                  );
                })}
              </div>

              <div className="chart-container">
                <h5>Total Credits Progress</h5>
                <PieChart width={300} height={300}>
                  <Pie
                    data={calculateTotalCreditsProgress()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#82ca9d"
                    dataKey="value"
                    onMouseEnter={(data, index) => {
                      const chartId = 'total-credits';
                      toggleTooltipVisibility(chartId, data.name, true, {
                        name: data.name,
                        value: data.value,
                        courses: data.courses,
                      });
                      setActiveTooltip(chartId);
                    }}
                  >
                    {calculateTotalCreditsProgress().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#82ca9d" : "#d3d3d3"} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
                {activeTooltip === 'total-credits' && (
                  <div className="tooltip-wrapper">
                    <CustomTooltip
                      onClose={() => {
                        toggleTooltipVisibility('total-credits', null, false, null);
                        setActiveTooltip(null);
                      }}
                      isVisible={activeTooltip === 'total-credits'}
                      chartId="total-credits"
                      data={tooltipData['total-credits']}
                    />
                  </div>
                )}
                <p>
                  {totalCredits} / {calculatedCreditsRequired + deficiencyCredits} credits
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Modal Overlay (Backdrop) */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          overflow: auto;
        }

        /* Modal Card */
        .modal-card {
          background-color: #fff;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          width: 90%;
          max-width: 1200px;
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
          padding: 1rem;
          box-sizing: border-box;
        }

        /* Close Button for Modal */
        .modal-close-button {
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          font-size: 1.2rem;
          color: #555;
          cursor: pointer;
          padding: 0.5rem;
        }

        .modal-close-button:hover {
          color: #912338;
        }

        /* Adjust toggle button styling */
        .toggle-insights-btn {
          background-color: #1aa824;
          color: white;
          border: none;
          border-radius: 5px;
          padding: 10px 20px;
          margin-left: 330px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .insights-section {
          max-width: 100%;
          padding: 1rem;
          box-sizing: border-box;
          display: block;
          background-color: #f9f9f9;
        }

        .course-pool-charts {
          display: flex;
          flex-wrap: wrap;
          gap: 10rem;
          padding: 1rem 0;
          justify-content: flex-start;
          align-items: flex-start;
        }

        .chart-container {
          flex: 0 0 auto;
          width: 300px;
          min-width: 240px;
          max-width: 400px;
          height: 450px;
          text-align: center;
          padding: 1rem 0;
          position: relative;
          overflow: visible;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
        }

        .chart-container h6 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
          white-space: normal;
          overflow: hidden;
          text-overflow: ellipsis;
          max-height: 4rem;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          flex-shrink: 0;
        }

        .chart-container .recharts-wrapper {
          width: 200px !important;
          height: 200px !important;
          max-height: 200px !important;
          margin: 0 auto;
          display: block;
          overflow: visible;
          flex-shrink: 0;
        }

        .chart-container p {
          font-size: 0.9rem;
          margin-top: 1rem;
          color: #555;
          text-align: center;
          position: relative;
          flex-shrink: 0;
        }

        .insights-section > .chart-container:last-child {
          flex: 0 0 auto;
          width: 300px;
          min-width: 300px;
          max-width: 300px;
          height: auto;
          margin: 3rem auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
        }

        .insights-section > .chart-container:last-child .recharts-wrapper {
          height: 300px !important;
          max-height: 300px !important;
          width: 250px !important;
          margin: 0 auto;
        }

        .insights-section::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .insights-section::-webkit-scrollbar-thumb {
          background-color: rgba(179, 163, 163, 0.8);
          border-radius: 15px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .insights-section::-webkit-scrollbar-thumb:hover {
          opacity: 1;
        }

        .insights-section::-webkit-scrollbar-track {
          border-radius: 10px;
          background-color: rgba(145, 35, 56, 0.1);
        }

        @media (max-width: 768px) {
          .course-pool-charts {
            gap: 1.5rem;
          }

          .chart-container {
            width: 220px;
            min-width: 220px;
            max-width: 220px;
            height: 430px;
          }

          .chart-container h6 {
            max-height: 4.5rem;
          }

          .chart-container .recharts-wrapper {
            width: 200px !important;
            height: 200px !important;
            max-height: 200px !important;
          }

          .insights-section > .chart-container:last-child {
            width: 250px;
            min-width: 250px;
            max-width: 250px;
            margin: 2rem auto;
          }

          .insights-section > .chart-container:last-child .recharts-wrapper {
            height: 250px !important;
            max-height: 250px !important;
            width: 200px !important;
          }
        }

        .custom-tooltip {
          background-color: #fff;
          border: 1px solid #ccc;
          border-radius: 5px;
          padding: 0.75rem;
          padding-top: 1.5rem;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          font-family: inherit;
          max-width: 200px;
          width: auto;
          box-sizing: border-box;
          z-index: 10;
          text-align: center;
        }

        .tooltip-title {
          margin: 0 0 0.5rem 0;
          font-weight: bold;
          font-size: 0.9rem;
          color: #333;
        }

        .tooltip-subtitle {
          margin: 0 0 0.25rem 0;
          font-size: 0.85rem;
          font-weight: 500;
          color: #555;
        }

        .tooltip-course-list {
          margin: 0;
          padding: 0;
          list-style-type: none;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
          max-height: 300px;
          overflow-y: auto;
        }

        .tooltip-course-list li {
          font-size: 0.8rem;
          font-weight: bold;
          color: white;
          line-height: 1.2;
          display: inline-block;
          background-color: #912338;
          padding: 0.2rem 0.5rem;
          border-radius: 3px;
        }

        .tooltip-empty {
          margin: 0;
          font-size: 0.8rem;
          font-style: italic;
          color: #777;
        }

        .tooltip-close-button {
          position: absolute;
          top: 5px;
          right: 5px;
          background: none;
          border: none;
          font-size: 0.9rem;
          color: #555;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .tooltip-close-button:hover {
          color: #912338;
        }

        .tooltip-more-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-style: italic;
          color: #777;
        }

        .tooltip-load-more {
          background: none;
          border: none;
          color: #4a90e2;
          cursor: pointer;
          padding: 0;
          font-size: 0.8rem;
          text-decoration: underline;
        }

        .tooltip-load-more:hover {
          color: #357abd;
        }

        .tooltip-wrapper {
          position: absolute;
          top: 50%;
          left: 100%;
          transform: translateY(-50%);
          margin-left: 1rem;
          z-index: 10;
        }

        .tooltip-course-list.expanded {
          max-height: 200px;
          overflow-y: auto;
        }

        .tooltip-course-list.expanded::-webkit-scrollbar {
          width: 5px;
        }

        .tooltip-course-list.expanded::-webkit-scrollbar-thumb {
          background-color: #ccc;
          border-radius: 5px;
        }

        .tooltip-course-list.expanded::-webkit-scrollbar-track {
          background-color: #f0f0f0;
        }

        .recharts-surface {
          overflow: visible !important;
        }

        .recharts-pie-label {
          opacity: 1 !important;
          transition: none !important;
        }

        .recharts-pie-label text {
          dominant-baseline: middle !important;
          text-anchor: middle !important;
        }
      `}</style>
    </div>
  );
};

export default ShowInsights;