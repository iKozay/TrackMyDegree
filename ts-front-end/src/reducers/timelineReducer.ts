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
} from "../handlers/timelineHandler";

export function timelineReducer(
  state: TimelineState,
  action: TimelineActionType
): TimelineState {
  // TODO : Add more actions like saveTimeLine, addExemption...
  switch (action.type) {
    case TimelineActionConstants.Init: {
      return initTimelineState(state, action.payload);
    }

    case TimelineActionConstants.SelectCourse:
      return selectCourse(state, action.payload);

    case TimelineActionConstants.MoveFromPoolToSemester:
      return moveFromPoolToSemester(state, action.payload);

    case TimelineActionConstants.MoveBetweenSemesters:
      return moveBetweenSemesters(state, action.payload);

    case TimelineActionConstants.RemoveFromSemester:
      return removeFromSemester(state, action.payload);

    case TimelineActionConstants.Undo:
      return undo(state);

    case TimelineActionConstants.Redo:
      return redo(state);

    case TimelineActionConstants.OpenModal:
      return openModal(state, action.payload);
    case TimelineActionConstants.ChangeCourseStatus:
      return changeCourseStatus(state, action.payload);

    case TimelineActionConstants.AddCourse:
      return addCourse(state, action.payload);

    default:
      return state;
  }
}
