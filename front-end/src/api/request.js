/* eslint-disable prettier/prettier */

export const request = async (url, options = {}) => {

    console.log("Making request to:", url);
    console.log("With options:", options);
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('Content-Type');

    return contentType?.includes('application/json') ? await response.json() : await response.text();
};
