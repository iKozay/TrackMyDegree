/* eslint-disable prettier/prettier */

import { request } from "./request";

//const SERVER = process.env.REACT_APP_SERVER || "http://localhost:8000";
const SERVER = "http://localhost:8000";
type HTTPMethod = 'GET' | "POST"| "PUT"| "PATCH"| "DELETE"
// Helper function to include token + headers
const buildOptions = (method: HTTPMethod, data:any, extraOptions:any = {}) => {
    const token = localStorage.getItem("token");
    const isFormData = data instanceof FormData;

    return {
        method,
        headers: {
            ...(!isFormData && { "Content-Type": "application/json" }),
            ...(token && { Authorization: `Bearer ${token}` }),
            ...extraOptions.headers,
        },
        ...(data && { body: isFormData ? data : JSON.stringify(data) }),
        ...extraOptions,
    };
};

// Generic wrappers for each method
export const api = {
    get: (endpoint:string, options = {}) =>
        request(`${SERVER}${endpoint}`, buildOptions("GET", null, options)),

    post: (endpoint:string, data:any, options = {}) =>
        request(`${SERVER}${endpoint}`, buildOptions("POST", data, options)),

    put: (endpoint:string, data:any, options = {}) =>
        request(`${SERVER}${endpoint}`, buildOptions("PUT", data, options)),

    patch: (endpoint:string, data:any, options = {}) =>
        request(`${SERVER}${endpoint}`, buildOptions("PATCH", data, options)),

    delete: (endpoint:string, options = {}) =>
        request(`${SERVER}${endpoint}`, buildOptions("DELETE", null, options)),
};

