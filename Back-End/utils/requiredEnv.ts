/*
 * Utility function to ensure required environment variables are set.
 * Accepts an array of variable names and returns an object of variable values.
 *
 * @param vars - An array of variable names (can contain just one variable).
 * @returns An object mapping variable names to their values.
 */
export function requiredEnv(vars: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const missing: string[] = [];

  for (const varName of vars) {
    const value = process.env[varName];
    if (value === undefined || value === '') {
      missing.push(varName);
    } else {
      result[varName] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return result;
}
