jest.mock('@controllers/courseController', () => ({
  courseController: {
    getCoursesByCodes: jest.fn().mockResolvedValue([]),
    getCourseByCode: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@controllers/degreeController', () => ({
  degreeController: {
    getCoursePoolsForDegree: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@middleware/cacheGet', () => ({
  cacheGET: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

import courseRoutes from '../routes/courseRoutes';

function getRouteHandler(path: string) {
  const layer = courseRoutes.stack.find(
    (entry: any) => entry.route?.path === path,
  );

  expect(layer?.route?.stack?.[1]?.handle).toEqual(expect.any(Function));

  return layer!.route!.stack[1]!.handle;
}

function createResponse() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return response;
}

describe('courseRoutes nullish parameter branches', () => {
  it('handles missing degreeId values in the by-degree handler', async () => {
    const handler = getRouteHandler('/by-degree/:degreeId');
    const res = createResponse();

    await handler({ params: {}, query: {} } as any, res as any, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Degree ID is required' });
  });

  it('handles missing code values in the by-code handler', async () => {
    const handler = getRouteHandler('/:code');
    const res = createResponse();

    await handler({ params: {}, query: {} } as any, res as any, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Course code is required' });
  });
});
