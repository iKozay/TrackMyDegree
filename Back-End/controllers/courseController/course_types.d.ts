namespace CourseTypes {
    export type CourseInfo = {
        code: string;
        credits: number;
        description: string;
    };
    export interface Requisite {
        type: 'pre' | 'co';
        code: string;
        description: string;
    }
}

export default CourseTypes;
