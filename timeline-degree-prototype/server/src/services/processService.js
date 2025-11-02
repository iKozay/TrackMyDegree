import { build } from '../data/build.js'

export const processUserData = async () => {
    // Simulate heavy computation like file processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return build();
};


