/*
 * Validation helper functions for tests to assert data integrity between a source and target
 * document or dataset.
 */

// validates the fields in the target match those in the source
function validateFields(source, target, fieldMappings) {
  for (const [sourceField, targetField = sourceField] of Object.entries(
    fieldMappings,
  )) {
    expect(target[targetField]).toBe(source[sourceField]);
  }
}

// Validates that arrays match as unordered sets (membership, not order)
function validateArrayFields(source, target, arrayFieldMappings) {
    for (const [sourceField, targetField = sourceField] of Object.entries(arrayFieldMappings)) {
        const src = (source[sourceField] || []).map((x) => x?.toString());
        const tgt = (target[targetField] || []).map((x) => x?.toString());

        const srcSet = new Set(src);
        const tgtSet = new Set(tgt);

        // Validate sets have identical membership
        expect(srcSet).toEqual(tgtSet);
    }
}
//Validates that a parent document contains a reference to a child document
function validateReference(parentDoc, parentField, childId) {
  expect(parentDoc[parentField]).toContain(childId);
}

// Validates that a document exists in the database
function validateDocumentExists(doc, entityType, id) {
  expect(doc).toBeTruthy();
  if (!doc) {
    throw new Error(`${entityType} with id ${id} not found in database`);
  }
}

// Validates that the target contains a subset of fields from the source based on the provided field mappings
function validateSubsetFields(source, target, fieldMappings) {
  for (const [sourceField, targetField = sourceField] of Object.entries(
    fieldMappings,
  )) {
    if (source[sourceField] !== undefined) {
      expect(target[targetField]).toBe(source[sourceField]);
    }
  }
}

// Validates that all elements in sourceArray are present in targetArray
function validateArrayContains(sourceArray, targetArray) {
  expect(targetArray).toEqual(expect.arrayContaining(sourceArray));
}

/**
 * Compare arrays of arrays (for prereq/coreq)
 * @param {Array[]} dbArray - Database array of arrays
 * @param {Array[]} expectedArray - Expected array of arrays
 * @returns {Object} - Object with missing and extra individual items
 */
function compareArraysOfArrays(dbArray, expectedArray) {
  // Flatten all arrays and get unique items
  const dbItems = new Set(dbArray.flat());
  const expectedItems = new Set(expectedArray.flat());
  
  // Find missing items (in expected but not in DB)
  const missing = Array.from(expectedItems).filter(item => !dbItems.has(item));
  
  // Find extra items (in DB but not in expected)
  const extra = Array.from(dbItems).filter(item => !expectedItems.has(item));
  
  return { missing, extra };
}

/**
 * Compare simple arrays (for not_taken)
 * @param {Array} dbArray - Database simple array
 * @param {Array} expectedArray - Expected simple array
 * @returns {Object} - Object with missing and extra items
 */
function compareSimpleArrays(dbArray, expectedArray) {
  const dbSet = new Set(dbArray);
  const expectedSet = new Set(expectedArray);
  
  // Find missing from DB
  const missing = expectedArray.filter(item => !dbSet.has(item));
  
  // Find extra in DB
  const extra = dbArray.filter(item => !expectedSet.has(item));
  
  return { missing, extra };
}

module.exports = {
  validateFields,
  validateArrayFields,
  validateReference,
  validateDocumentExists,
  validateSubsetFields,
  validateArrayContains,
  compareArraysOfArrays,
  compareSimpleArrays,
};
