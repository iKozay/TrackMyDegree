declare namespace RequisiteTypes {
  type RequisiteType = 'pre' | 'co';

  type Requisite = {
    id: string;
    code1: string;
    code2: string;
    type: RequisiteType;
  };
}

export default RequisiteTypes;
