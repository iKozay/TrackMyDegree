/* eslint-disable prettier/prettier */

import { request } from "./request";

const SERVER = process.env.REACT_APP_SERVER || "http://localhost:8000";

// Helper function to include token + headers
const buildOptions = (method, data, extraOptions = {}) => {
    const token = localStorage.getItem("token");

    return {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
            ...extraOptions.headers,
        },
        ...(data && { body: JSON.stringify(data) }),
        ...extraOptions,
    };
};

// Generic wrappers for each method
export const api = {
    get: (endpoint, options = {}) =>
        request(`${SERVER}${endpoint}`, buildOptions("GET", null, options)),

    post: (endpoint, data, options = {}) =>
        request(`${SERVER}${endpoint}`, buildOptions("POST", data, options)),

    put: (endpoint, data, options = {}) =>
        request(`${SERVER}${endpoint}`, buildOptions("PUT", data, options)),

    patch: (endpoint, data, options = {}) =>
        request(`${SERVER}${endpoint}`, buildOptions("PATCH", data, options)),

    delete: (endpoint, options = {}) =>
        request(`${SERVER}${endpoint}`, buildOptions("DELETE", null, options)),
    
    //helper for for file uploads
    upload: (endpoint, formData, options = {}) => {
    const token = localStorage.getItem("token");

    return request(`${SERVER}${endpoint}`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Content-Type is not set manually
        ...options.headers,
      },
      body: formData, // raw FormData object
      ...options,
    });
  },
};

