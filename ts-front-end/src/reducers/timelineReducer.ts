import type { TimelineActionType } from "../types/timeline.types";
import { TimelineActionConstants } from "../types/actions";
import type { TimelineState } from "../types/timeline.types";
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
  addSemester,
  validateTimeline,
} from "../handlers/timelineHandler";

export function timelineReducer(
  state: TimelineState,
  action: TimelineActionType
): TimelineState {
  let nextState: TimelineState;

  switch (action.type) {
    case TimelineActionConstants.Init:
      return initTimelineState(state, action.payload);

    case TimelineActionConstants.SelectCourse:
      return selectCourse(state, action.payload);

    case TimelineActionConstants.OpenModal:
      return openModal(state, action.payload);

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

    case TimelineActionConstants.AddSemester:
      nextState = addSemester(state);
      break;

    default:
      return state;
  }

  // 🔍 Validate ONLY newly constructed states
  return validateTimeline(nextState);
}
