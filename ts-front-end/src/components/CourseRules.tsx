import React, { useState } from "react";
import type { Rule } from "@trackmydegree/shared";
import type { Course, CourseMap, CourseStatusValue, SemesterList } from "../types/timeline.types";
import { History, ClockArrowDown, CalendarClock, Calculator, CalendarX, ChevronDown, ChevronUp } from "lucide-react";
import "../styles/components/CourseRules.css";

interface CourseRulesProps {
  course: Course;
  courses: CourseMap;
  semesters: SemesterList;
}

interface RuleDisplayInfo {
  title: string;
  icon: React.ReactNode;
}

const ruleTypeDisplayMap: Record<string, RuleDisplayInfo> = {
  prerequisite: {
    title: "Prerequisites",
    icon: <History size={16} />,
  },
  corequisite: {
    title: "Corequisites",
    icon: <ClockArrowDown size={16} />,
  },
  prerequisite_or_corequisite: {
    title: "Prerequisites or Corequisites",
    icon: <CalendarClock size={16} />,
  },
  min_credits: {
    title: "Minimum Credits Required",
    icon: <Calculator size={16} />,
  },
  not_taken: {
    title: "Exclusions",
    icon: <CalendarX size={16} />,
  },
};

const CourseRules: React.FC<CourseRulesProps> = ({ course, courses, semesters }) => {

  if (!Array.isArray(course.rules) || course.rules.length === 0) {
    return null;
  }

  // Check if a specific rule is satisfied (not in violations)
  const isRuleSatisfied = (rule: Rule): boolean => {
    // Find the course in semesters and check if message contains the rule message
    for (const semester of semesters) {
      for (const semCourse of semester.courses) {
        if (semCourse.code === course.id) {
          if (semCourse.message.includes(rule.message)) {
            return false; // Rule is violated
          }
        }
      }
    }
    return true; // Rule is satisfied
  };

  // Group rules by type
  const groupedRules = course.rules.reduce((acc, rule) => {
    const ruleType = rule.type;
    if (!acc[ruleType]) {
      acc[ruleType] = [];
    }
    acc[ruleType].push(rule);
    return acc;
  }, {} as Record<string, Rule[]>);

  // Define the order as specified
  const ruleTypeOrder = [
    "min_credits",
    "prerequisite",
    "corequisite",
    "prerequisite_or_corequisite",
    "not_taken",
  ];

  // Sort rule types according to the specified order
  const sortedRuleTypes = ruleTypeOrder.filter(ruleType => groupedRules[ruleType]);

  // Initialize collapsed sections - collapse satisfied sections by default
  const getInitialCollapsedSections = (): Set<string> => {
    const collapsed = new Set<string>();

    sortedRuleTypes.forEach(ruleType => {
      const rulesOfType = groupedRules[ruleType];
      const allRulesSatisfied = rulesOfType.every(rule => isRuleSatisfied(rule));

      if (allRulesSatisfied) {
        collapsed.add(ruleType);
      }
    });

    return collapsed;
  };

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(getInitialCollapsedSections());

  const toggleSection = (ruleType: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(ruleType)) {
      newCollapsed.delete(ruleType);
    } else {
      newCollapsed.add(ruleType);
    }
    setCollapsedSections(newCollapsed);
  };

  const getCourseStatus = (courseCode: string): CourseStatusValue | undefined => {
    return courses[courseCode]?.status?.status;
  };

  const renderCourseList = (courseList: string[]) => {
    if (!courseList || courseList.length === 0) {
      return null;
    }

    return (
      <div className="course-list">
        {courseList.map((courseCode, index) => {
          const status = getCourseStatus(courseCode);
          return (
            <span
              key={`${courseCode}-${index}`}
              className={`course-item status-${status ?? "unknown"}`}
            >
              {courseCode}
            </span>
          );
        })}
      </div>
    );
  };

  const renderRuleContent = (rule: Rule) => {
    const params = rule.params as any;

    // If the rule has a message, use it
    if (rule.message) {
      return (
        <div className="rule-content">
          <p className="rule-message">{rule.message.split(":")[0]}:</p>
          {params.courseList && renderCourseList(params.courseList)}
        </div>
      );
    }

    // Fallback rendering for rules without messages
    if (params.courseList) {
      let messageText = "";
      switch (rule.type) {
        case "prerequisite":
          messageText = "Needs to be completed before taking this course";
          break;
        case "corequisite":
          messageText = "Needs to be taken in the same semester as this course";
          break;
        case "prerequisite_or_corequisite":
          messageText = "Needs to be taken either before or in the same semester as this course";
          break;
        case "not_taken":
          messageText = "Cannot be taken with this course";
          break;
        case "min_credits":
          messageText = "Minimum credits required";
          break;
      }

      return (
        <div className="rule-content">
          <p className="rule-message">{messageText}</p>
          {renderCourseList(params.courseList)}
        </div>
      );
    }

    if (params.minCredits) {
      return (
        <div className="rule-content">
          <p className="rule-message">
            Minimum {params.minCredits} credits required
          </p>
        </div>
      );
    }

    return (
      <div className="rule-content">
        <p className="rule-message">Rule parameters not recognized</p>
      </div>
    );
  };

  return (
    <div className="course-rules">
      {sortedRuleTypes.map((ruleType) => {
        const displayInfo = ruleTypeDisplayMap[ruleType] || {
          title: ruleType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
          icon: <History size={16} />,
        };

        const rulesOfType = groupedRules[ruleType];
        const isCollapsed = collapsedSections.has(ruleType);

        // Check if all rules in this section are satisfied
        const allRulesSatisfied = rulesOfType.every(rule => isRuleSatisfied(rule));

        return (
          <div key={ruleType} className={`rule-section ${allRulesSatisfied ? 'section-satisfied' : 'section-unsatisfied'}`}>
            <div
              className="rule-header"
              onClick={() => toggleSection(ruleType)}
            >
              {displayInfo.icon}
              <h4>{displayInfo.title}</h4>
              <div className="spacer"></div>
              {isCollapsed ? (
                <ChevronDown size={16} className="collapse-icon" />
              ) : (
                <ChevronUp size={16} className="collapse-icon" />
              )}
            </div>

            {!isCollapsed && (
              <div className="rule-items">
                {rulesOfType.map((rule, index) => (
                  <div
                    key={`${ruleType}-${index}`}
                    className={`rule-item ${isRuleSatisfied(rule) ? 'satisfied' : 'unsatisfied'}`}
                  >
                    {renderRuleContent(rule)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CourseRules;