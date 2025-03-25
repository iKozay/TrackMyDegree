namespace CourseTypes {
    export type CourseInfo = {
        code: string;
        title: string;
        credits: number;
        offeredIn: string;
        description: string;
    };
    export type CourseInfoDB = CourseInfo & {
        requisites: RequisiteInfo[];
    };
    export interface Requisite {
        type: 'pre' | 'co';
        code: string;
        description: string;
    }
    export interface CoursePoolInfo {
        poolId: string;
        poolName: string;
        courses: CourseInfo[];
    }
}

export default CourseTypes;
