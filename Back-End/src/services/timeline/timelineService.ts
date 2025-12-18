// services/buildTimeline.ts

type TimelineFileData = {
  type: 'file';
  // eslint-disable-next-line no-undef
  data: Buffer | Express.Multer.File; // adjust if you only use Buffer
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

  // here you can branch logic if needed
  if (type === 'file') {
    // data is Buffer | Express.Multer.File
    // parse file and build timeline
    console.log('Received file data for timeline building:', data);
  } else {
    // type === "object" form data
    // data is Record<string, unknown>
    // handle object-based timeline building
    console.log('Received form data for timeline building:', data);
  }

  // replace with your actual implementation
  return { status: 'done' };
};
