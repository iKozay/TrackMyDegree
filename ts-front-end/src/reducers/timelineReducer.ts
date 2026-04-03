import type { TimelineActionType, TimelineState } from "../types/timeline.types";
import { TimelineActionConstants} from "../types/actions";
import {
  initTimelineState,
  selectCourse,
  moveFromPoolToSemester,
  moveBetweenSemesters,
  removeFromSemester,
  undo,
  redo,
  openModal,
  changeCourseStatus,
  addCourse,
  removeCourse,
  addSemester,
  addFallWinterSemester,
  removeSemester,
  moveSemester,
  validateTimeline,
} from "../handlers/timelineHandler";

export function timelineReducer(
  state: TimelineState,
  action: TimelineActionType
): TimelineState {
  let nextState: TimelineState;

  switch (action.type) {
    case TimelineActionConstants.Init:
      nextState = initTimelineState(state, action.payload);
      break;

    case TimelineActionConstants.SelectCourse:
      return selectCourse(state, action.payload);

    case TimelineActionConstants.OpenModal:
      return openModal(state, action.payload);

    case TimelineActionConstants.SetTimelineName:
        return { ...state, timelineName: action.payload.timelineName };

    /* ---------- STATE RESTORATION ---------- */

    case TimelineActionConstants.Undo:
      return undo(state);

    case TimelineActionConstants.Redo:
      return redo(state);

    /* ---------- STATE CONSTRUCTION ---------- */

    case TimelineActionConstants.MoveFromPoolToSemester:
      nextState = moveFromPoolToSemester(state, action.payload);
      break;

    case TimelineActionConstants.MoveBetweenSemesters:
      nextState = moveBetweenSemesters(state, action.payload);
      break;

    case TimelineActionConstants.RemoveFromSemester:
      nextState = removeFromSemester(state, action.payload);
      break;

    case TimelineActionConstants.ChangeCourseStatus:
      nextState = changeCourseStatus(state, action.payload);
      break;

    case TimelineActionConstants.AddCourse:
      nextState = addCourse(state, action.payload);
      break;

    case TimelineActionConstants.RemoveCourse:
      nextState = removeCourse(state, action.payload);
      break;

    case TimelineActionConstants.AddSemester:
      nextState = addSemester(state);
      break;

    case TimelineActionConstants.AddFallWinterSemester:
      nextState = addFallWinterSemester(state);
      break;

    case TimelineActionConstants.RemoveSemester:
      nextState = removeSemester(state, action.payload);
      break;

    case TimelineActionConstants.MoveSemester:
      nextState = moveSemester(state, action.payload);
      break;

    default:
      return state;
  }

  // 🔍 Validate ONLY newly constructed states
  return validateTimeline(nextState);
}
