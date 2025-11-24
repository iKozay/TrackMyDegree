// services/buildTimeline.ts
import { parseDocument } from "@services/parsingService";

type TimelineFileData = {
  type: 'file';
  // eslint-disable-next-line no-undef
  data: Buffer;
};

type TimelineObjectData = {
  type: 'form';
  data: Record<string, unknown>; // or a more specific interface
};

export type BuildTimelineParams = TimelineFileData | TimelineObjectData;

// adjust Promise<unknown> to a specific type or ReturnType<typeof build> if you want
export const buildTimeline = async (
  params: BuildTimelineParams,
): Promise<unknown> => {
  const { type, data } = params;

  if (type === 'file') {
    // data is Buffer | Express.Multer.File
    // parse file and build timeline
    let parsedData = parseDocument(data)
    //create timeline using the parsed data
  } else {
    // type === "object" form data
    // data is Record<string, unknown>
    // handle object-based timeline building
  }

  // replace with your actual implementation
  return { status: 'done' };
};
