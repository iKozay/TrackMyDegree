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
  // console.log('ShowInsights Props:');
  // console.log('coursePools:', coursePools);
  // console.log('semesterCourses:', semesterCourses);
  // console.log('creditsRequiredProp:', creditsRequiredProp);
  // console.log('deficiencyCredits:', deficiencyCredits);
  // console.log('courseInstanceMap:', courseInstanceMap);

  if (!courseInstanceMap) {
    console.warn(
      'courseInstanceMap is undefined or not passed to ShowInsights',
    );
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
    console.warn(
      `Could not parse max credits from pool name "${poolName}". Using total pool credits: ${totalPoolCredits}`,
    );
    return totalPoolCredits;
  };

  const calculatedCreditsRequired = useMemo(() => {
    return coursePools.reduce((sum, pool) => {
      const maxCredits = parseMaxCreditsFromPoolName(
        pool.poolName,
        pool.courses,
      );
      return sum + maxCredits;
    }, 0);
  }, [coursePools]);

  // console.log(
  //   'Calculated creditsRequired from coursePools:',
  //   calculatedCreditsRequired,
  // );

  const calculateTotalCredits = () => {
    const poolCreditMap = {};

    coursePools.forEach((pool) => {
      poolCreditMap[pool.poolId] = {
        assigned: 0,
        max: parseMaxCreditsFromPoolName(pool.poolName, pool.courses),
      };
    });

    // console.log('Initialized poolCreditMap:', poolCreditMap);

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
        // console.log(
        //   `Added ${course.credits} credits for ${genericCode} to pool ${pool.poolId}. New assigned: ${poolData.assigned}`,
        // );
      });
    });

    const total = Object.values(poolCreditMap).reduce(
      (sum, poolData) => sum + poolData.assigned,
      0,
    );

    // console.log('Final poolCreditMap:', poolCreditMap);
    // console.log('Total credits calculated:', total);

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

      const assignedGenericCodes = [
        ...new Set(
          allAssignedInstanceIds.map((instanceId) => {
            const genericCode = courseInstanceMap[instanceId] || instanceId;
            return genericCode;
          }),
        ),
      ];

      const assignedCourses = assignedGenericCodes.filter((cCode) =>
        pool.courses.some((c) => c.code === cCode),
      );

      const assignedCredits = assignedCourses
        .map((cCode) => {
          const courseInPool = pool.courses.find((c) => c.code === cCode);
          return courseInPool ? courseInPool.credits : 0;
        })
        .reduce((sum, c) => sum + c, 0);

      const maxCredits = parseMaxCreditsFromPoolName(
        pool.poolName,
        pool.courses,
      );
      const remainingCredits = Math.max(0, maxCredits - assignedCredits);

      const remainingCoursesInPool = pool.courses
        .filter((course) => !assignedCourses.includes(course.code))
        .map((course) => course.code);

      return {
        poolName: pool.poolName,
        data: [
          {
            name: 'Completed',
            value: assignedCredits,
            courses: assignedCourses,
          },
          {
            name: 'Remaining',
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

    // console.log('calculateTotalCreditsProgress:');
    // console.log('totalAssigned:', totalAssigned);
    // console.log('totalRequired:', totalRequired);

    if (totalRequired === 0) {
      console.warn(
        'totalRequired is 0; creditsRequired could not be calculated from coursePools',
      );
      return [
        { name: 'Completed', value: 0, courses: [] },
        { name: 'Remaining', value: 1, courses: [] },
      ];
    }

    const assignedCourses = Object.keys(semesterCourses)
      .filter((semesterId) => semesterId.toLowerCase() !== 'exempted')
      .flatMap((semesterId) =>
        semesterCourses[semesterId].map(
          (instanceId) => courseInstanceMap[instanceId] || instanceId,
        ),
      );

    // Identify pools with more than 100 courses
    const largePools = coursePools.filter((pool) => pool.courses.length > 100);
    const largePoolCourseCodes = new Set(
      largePools.flatMap((pool) => pool.courses.map((course) => course.code)),
    );

    // Get all course codes from all pools
    const allPoolCourses = coursePools.flatMap((pool) =>
      pool.courses.map((course) => course.code),
    );

    // Calculate remaining courses, excluding those from large pools
    let remainingCourses = allPoolCourses.filter(
      (courseCode) =>
        !assignedCourses.includes(courseCode) &&
        !largePoolCourseCodes.has(courseCode),
    );

    // For each large pool, add a single "General Elective" entry to remainingCourses
    largePools.forEach((pool) => {
      // Check if any courses from this pool are unassigned
      const poolCourses = pool.courses.map((course) => course.code);
      const hasUnassignedCourses = poolCourses.some(
        (courseCode) => !assignedCourses.includes(courseCode),
      );
      if (hasUnassignedCourses) {
        remainingCourses.push('General Elective');
      }
    });

    const remainingCredits = Math.max(0, totalRequired - totalAssigned);
    // console.log('remainingCredits:', remainingCredits);

    return [
      {
        name: 'Completed',
        value: totalAssigned,
        courses: assignedCourses,
      },
      {
        name: 'Remaining',
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
        <button className="tooltip-close-button" onClick={onClose}>
          ✕
        </button>
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

  const renderCharts = () => {
    const poolProgress = calculatePoolProgress();
    const totalProgress = calculateTotalCreditsProgress();
    const allCharts = [
      ...poolProgress.map((pool, index) => ({
        type: 'pool',
        poolName: pool.poolName,
        data: pool.data,
        maxCredits: pool.maxCredits,
        index,
      })),
      {
        type: 'total',
        poolName: 'Total Credits Progress',
        data: totalProgress,
        maxCredits: calculatedCreditsRequired + deficiencyCredits,
      },
    ];

    return allCharts.map((chart, idx) => {
      const chartId =
        chart.type === 'total' ? 'total-credits' : `pool-${chart.index}`;
      const isTooltipVisible = activeTooltip === chartId;
      const currentTooltipData = tooltipData[chartId];

      return (
        <div
          key={idx}
          className="chart-container"
          style={{ minWidth: '250px' }}
        >
          <h6>{chart.poolName}</h6>
          <PieChart width={500} height={200} margin={{ right: 50, left: 20 }}>
            <Pie
              data={chart.data}
              cx="50%"
              cy="50%"
              innerRadius={120}
              outerRadius={250}
              fill="#8884d8"
              dataKey="value"
              labelLine={false}
              label={(props) => {
                const { cx, cy, midAngle, innerRadius, outerRadius, value } =
                  props;
                const RADIAN = Math.PI / 180;
                const radius = 260;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                const percent = (value / chart.maxCredits) * 100;

                return (
                  <text
                    x={x}
                    y={y}
                    fill="#333"
                    textAnchor={x > cx ? 'start' : 'end'}
                    dominantBaseline="central"
                    style={{ fontSize: '35px', fontWeight: 'bold' }}
                  >
                    {`${percent.toFixed(0)}%`}
                  </text>
                );
              }}
              isAnimationActive={animationActive}
              isUpdateAnimationActive={false}
              onMouseEnter={(data) => {
                toggleTooltipVisibility(chartId, data.name, true, {
                  name: data.name,
                  value: data.value,
                  courses: data.courses,
                });
                setActiveTooltip(chartId);
              }}
            >
              {chart.data.map((entry, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={
                    entry.name === 'Completed'
                      ? chart.type === 'total'
                        ? '#82ca9d'
                        : '#4a90e2'
                      : '#d3d3d3'
                  }
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
          <p>
            {chart.data[0].value} / {chart.maxCredits} credits
          </p>
        </div>
      );
    });
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
              <h5>Course Pool Progress</h5>
              <div className="course-pool-charts">{renderCharts()}</div>
            </div>
          </div>
        </div>
      )}

      <style>{`
 /* Modal Overlay */
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
  padding: 1rem;
  box-sizing: border-box;
}

/* Modal Card */
.modal-card {
  background-color: #f9f9f9;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 1200px; /* Default max-width */
  max-height: 90vh; /* Fixed max-height */
  overflow-y: auto;
  position: relative;
  padding: 0;
  box-sizing: border-box;
  margin: 0 auto;
  transition: max-width 0.3s ease; /* Transition only for max-width */
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
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: block;
  width: fit-content;
}

.insights-section {
  background-color: #f9f9f9;
  max-width: 100%;
  padding: 0.5rem;
  box-sizing: border-box;
  display: block;
}

.course-pool-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 2.5rem;
  padding: 1rem 0;
  justify-content: center;
  width: 100%;
}

.chart-container {
  width: 100%;
  height: auto;
  min-height: 300px;
  text-align: center;
  padding: 0.75rem;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
  margin: 0 auto;
}

.chart-container h6 {
  font-size: 0.95rem;
  margin-bottom: 0.4rem;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 3.6rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  flex-shrink: 0;
  width: 100%;
}

.chart-container .recharts-wrapper {
  width: 100% !important;
  max-width: 200px;
  height: auto !important;
  aspect-ratio: 1/1;
  margin: 0 auto;
  display: block;
  overflow: visible;
  flex-shrink: 0;
}

.chart-container p {
  font-size: 0.85rem;
  margin-top: 0.8rem;
  color: #555;
  text-align: center;
  position: relative;
  flex-shrink: 0;
  width: 100%;
}

.insights-section > .chart-container:last-child {
  width: 100%;
  max-width: 350px;
  height: auto;
  margin: 1.5rem auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.insights-section > .chart-container:last-child .recharts-wrapper {
  height: auto !important;
  max-height: none !important;
  width: 100% !important;
  max-width: 250px;
  aspect-ratio: 1/1;
  margin: 0 auto;
}

/* Scrollbar styles */
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

/* Tooltip styles */
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
  z-index: 1000;
  text-align: center;
  position: relative;
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
  max-height: 200px;
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
  left: 80%;
  transform: translateY(-50%);
  margin-left: 0.5rem;
  z-index: 1000;
  width: auto;
  max-width: 200px;
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

/* Responsive adjustments */
@media (max-width: 1200px) {
  .modal-card {
    max-width: 1000px;
    padding: 0.9rem;
  }

  .course-pool-charts {
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
  }

  .chart-container {
    min-height: 280px;
  }

  .insights-section > .chart-container:last-child {
    max-width: 320px;
  }
}

@media (max-width: 1024px) {
  .modal-card {
    max-height: 85vh;
    padding: 0.8rem;
  }

  .course-pool-charts {
    grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
    gap: 1.8rem;
  }

  .chart-container {
    min-height: 260px;
  }

  .chart-container .recharts-wrapper {
    max-width: 180px;
  }

  .insights-section > .chart-container:last-child {
    max-width: 300px;
  }

  .insights-section > .chart-container:last-child .recharts-wrapper {
    max-width: 230px;
  }
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 0.5rem;
  }

  .modal-card {
    max-height: 90vh;
    padding: 0.7rem;
  }

  .course-pool-charts {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .chart-container {
    min-height: 240px;
    max-width: 280px;
  }

  .chart-container h6 {
    font-size: 0.9rem;
  }

  .chart-container p {
    font-size: 0.8rem;
  }

  .chart-container .recharts-wrapper {
    max-width: 160px;
  }

  .insights-section > .chart-container:last-child {
    max-width: 280px;
  }

  .insights-section > .chart-container:last-child .recharts-wrapper {
    max-width: 210px;
  }

  .tooltip-wrapper {
    position: relative;
    top: auto;
    left: auto;
    transform: none;
    margin: 0.8rem auto;
    width: 100%;
    max-width: 180px;
  }
}

@media (max-width: 600px) {
  .modal-overlay {
    padding: 0.4rem;
  }

  .modal-card {
    padding: 0.6rem;
  }

  .course-pool-charts {
    grid-template-columns: 1fr;
    gap: 1.2rem;
  }

  .chart-container {
    min-height: 220px;
    max-width: 260px;
  }

  .chart-container .recharts-wrapper {
    max-width: 150px;
  }

  .insights-section > .chart-container:last-child {
    max-width: 260px;
  }

  .insights-section > .chart-container:last-child .recharts-wrapper {
    max-width: 200px;
  }

  .tooltip-wrapper {
    max-width: 160px;
  }
}

@media (max-width: 480px) {
  .modal-card {
    width: 100%;
    padding: 0.5rem;
    border-radius: 8px;
  }

  .course-pool-charts {
    gap: 1rem;
  }

  .chart-container {
    min-height: 200px;
    max-width: 240px;
    padding: 0.5rem;
  }

  .chart-container h6 {
    font-size: 0.85rem;
    max-height: 3.2rem;
  }

  .chart-container p {
    font-size: 0.75rem;
    margin-top: 0.6rem;
  }

  .chart-container .recharts-wrapper {
    max-width: 140px;
  }

  .toggle-insights-btn {
    padding: 8px 16px;
    font-size: 14px;
  }

  .insights-section > .chart-container:last-child {
    max-width: 240px;
    margin: 1rem auto;
  }

  .insights-section > .chart-container:last-child .recharts-wrapper {
    max-width: 190px;
  }

  .tooltip-wrapper {
    max-width: 150px;
  }
}

@media (max-width: 360px) {
  .modal-overlay {
    padding: 0.3rem;
  }

  .modal-card {
    padding: 0.4rem;
  }

  .chart-container {
    min-height: 180px;
    max-width: 220px;
  }

  .chart-container h6 {
    font-size: 0.8rem;
    max-height: 3rem;
  }

  .chart-container p {
    font-size: 0.7rem;
  }

  .chart-container .recharts-wrapper {
    max-width: 130px;
  }

  .insights-section > .chart-container:last-child {
    max-width: 220px;
  }

  .insights-section > .chart-container:last-child .recharts-wrapper {
    max-width: 180px;
  }

  .tooltip-wrapper {
    max-width: 140px;
    margin: 0.6rem auto;
  }
}

@media (max-width: 320px) {
  .modal-overlay {
    padding: 0.2rem;
  }

  .modal-card {
    padding: 0.3rem;
  }

  .chart-container {
    min-height: 160px;
    max-width: 200px;
  }

  .chart-container h6 {
    font-size: 0.75rem;
    max-height: 2.8rem;
  }

  .chart-container .recharts-wrapper {
    max-width: 120px;
  }

  .insights-section > .chart-container:last-child {
    max-width: 200px;
  }

  .insights-section > .chart-container:last-child .recharts-wrapper {
    max-width: 170px;
  }

  .tooltip-wrapper {
    max-width: 130px;
  }
}

`}</style>
    </div>
  );
};

export default ShowInsights;
