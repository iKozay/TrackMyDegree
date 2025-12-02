/*
 * A utility class for reporting and logging validation errors during data processing.
 * It categorizes errors, tracks their details, and provides methods to log summaries and specifics.
 * This is used so we can track validation issues in integration tests without immediately failing the tests.
 */
class ValidationErrorReporter {
  constructor() {
    this.errors = [];
  }

  addError(category, details) {
    this.errors.push({
      category,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  addMissingEntity(entityType, entityId, context = {}) {
    this.addError('MISSING_ENTITY', {
      entityType,
      entityId,
      context,
    });
  }

  addValidationFailure(fieldName, expected, actual, context = {}) {
    this.addError('VALIDATION_FAILURE', {
      fieldName,
      expected,
      actual,
      context,
    });
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  getErrorsByCategory(category) {
    return this.errors.filter((error) => error.category === category);
  }

  getErrorSummary() {
    const summary = {};
    for (const error of this.errors) {
      summary[error.category] = (summary[error.category] || 0) + 1;
    }
    return summary;
  }
  /*
   * Logs errors to the console, grouped by category, with a summary header.
   * If a contextId is provided, it is included in the log header for clarity.
   */
  logErrors(contextId = '') {
    if (!this.hasErrors()) {
      const message = contextId
        ? `No validation errors for ${contextId}`
        : 'No validation errors';
      console.log(message);
      return;
    }

    const summary = this.getErrorSummary();
    const errorHeader = contextId
      ? `VALIDATION ERRORS for ${contextId}`
      : 'VALIDATION ERRORS';
    console.error(`${errorHeader}: ${this.errors.length} total`);

    for (const [category, count] of Object.entries(summary)) {
      console.error(`  ${category}: ${count} errors`);
    }

    // Log detailed errors by category
    for (const category of Object.keys(summary)) {
      const categoryErrors = this.getErrorsByCategory(category);
      console.error(`\n    ${category} (${categoryErrors.length}):`);

      for (const error of categoryErrors) {
        switch (error.category) {
          case 'MISSING_ENTITY': {
            const parentContext = error.context.parentId
              ? ` (parent: ${error.context.parentId})`
              : '';
            console.error(
              `    - ${error.entityType} ${error.entityId}${parentContext}`,
            );
            break;
          }
          case 'VALIDATION_FAILURE': {
            console.error(
              `    - Field '${error.fieldName}': expected '${error.expected}', got '${error.actual}'`,
            );
            break;
          }
          default: {
            console.error(`    - ${JSON.stringify(error)}`);
          }
        }
      }
    }
  }

  clear() {
    this.errors = [];
  }
}

module.exports = { ValidationErrorReporter };
