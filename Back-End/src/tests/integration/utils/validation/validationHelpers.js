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

module.exports = {
  validateFields,
  validateArrayFields,
  validateReference,
  validateDocumentExists,
  validateSubsetFields,
  validateArrayContains,
};
