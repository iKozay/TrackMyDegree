declare namespace DegreeXCPTypes {
  type DegreeXCP = {
    degree_id: string;
    coursepool_id: string;
  };

  type NewDegreeXCP = DegreeXCP & {
    credits: number;
  };

  type DegreeXCPItem = NewDegreeXCP & {
    id: string;
  };
}

export default DegreeXCPTypes;
