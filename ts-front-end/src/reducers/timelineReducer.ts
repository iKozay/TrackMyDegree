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
} from "../handlers/timelineHandler";

export function timelineReducer(
  state: TimelineState,
  action: TimelineActionType
): TimelineState {
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

    default:
      return state;
  }
}
