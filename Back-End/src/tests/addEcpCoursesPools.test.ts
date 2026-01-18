// tests/addEcpCoursePools.test.ts
import { addEcpCoursePools } from "@services/timeline/timelineService";
import { degreeController } from "@controllers/degreeController";

jest.mock("@controllers/degreeController", () => ({
  degreeController: {
    readDegree: jest.fn(),
    getCoursePoolsForDegree: jest.fn(),
    getCoursesForDegree: jest.fn(),
    readAllDegrees: jest.fn(),
  },
}));

describe("addEcpCoursePools", () => {
  const mockedDegreeController = degreeController as jest.Mocked<
    typeof degreeController
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds ENGR_ECP pools + pool names to deficiencies when degreeId includes BEng", async () => {
    // mock getDegreeData("ENGR_ECP") internals
    mockedDegreeController.readDegree.mockResolvedValue({
      _id: "ENGR_ECP",
      name: "ENGR ECP",
    } as any);

    mockedDegreeController.getCoursePoolsForDegree.mockResolvedValue([
      {
        _id: "ecp_pool_1",
        name: "ECP Pool 1",
        creditsRequired: 0,
        courses: [],
      },
      {
        _id: "ecp_pool_2",
        name: "ECP Pool 2",
        creditsRequired: 0,
        courses: [],
      },
    ] as any);

    mockedDegreeController.getCoursesForDegree.mockResolvedValue([] as any);

    const coursePools: any[] = [
      { _id: "base_pool", name: "Base Pool", creditsRequired: 0, courses: [] },
    ];
    const deficiencies: string[] = ["SOEN 000"];

    await addEcpCoursePools("BEng_SOFTWARE", coursePools, deficiencies);

    // pools were appended
    expect(coursePools.map((p) => p._id)).toEqual([
      "base_pool",
      "ecp_pool_1",
      "ecp_pool_2",
    ]);

    // deficiency pool names were appended
    expect(deficiencies).toEqual(["SOEN 000", "ECP Pool 1", "ECP Pool 2"]);

    // verify the ECP degree id used
    expect(mockedDegreeController.readDegree).toHaveBeenCalledWith("ENGR_ECP");
    expect(mockedDegreeController.getCoursePoolsForDegree).toHaveBeenCalledWith(
      "ENGR_ECP",
    );
    expect(mockedDegreeController.getCoursesForDegree).toHaveBeenCalledWith(
      "ENGR_ECP",
    );
  });

  it("adds COMP_ECP pools when degreeId includes BCompSc", async () => {
    mockedDegreeController.readDegree.mockResolvedValue({
      _id: "COMP_ECP",
      name: "COMP ECP",
    } as any);

    mockedDegreeController.getCoursePoolsForDegree.mockResolvedValue([
      {
        _id: "comp_ecp_pool",
        name: "COMP ECP Pool",
        creditsRequired: 0,
        courses: [],
      },
    ] as any);

    mockedDegreeController.getCoursesForDegree.mockResolvedValue([] as any);

    const coursePools: any[] = [];
    const deficiencies: string[] = [];

    await addEcpCoursePools("BCompSc_GENERAL", coursePools, deficiencies);

    expect(coursePools.map((p) => p._id)).toEqual(["comp_ecp_pool"]);
    expect(deficiencies).toEqual(["COMP ECP Pool"]);

    expect(mockedDegreeController.readDegree).toHaveBeenCalledWith("COMP_ECP");
  });

  it("does nothing if degreeId doesn't include BEng or BCompSc", async () => {
    const coursePools: any[] = [{ _id: "base_pool" }];
    const deficiencies: string[] = ["X"];

    await addEcpCoursePools("BA_ARTS", coursePools, deficiencies);

    expect(coursePools).toEqual([{ _id: "base_pool" }]);
    expect(deficiencies).toEqual(["X"]);

    expect(mockedDegreeController.readDegree).not.toHaveBeenCalled();
    expect(mockedDegreeController.getCoursePoolsForDegree).not.toHaveBeenCalled();
    expect(mockedDegreeController.getCoursesForDegree).not.toHaveBeenCalled();
  });
});
