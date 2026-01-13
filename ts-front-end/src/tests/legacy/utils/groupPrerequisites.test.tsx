import { describe, test, expect } from 'vitest';
import { groupPrerequisites } from '../../../legacy/utils/groupPrerequisites';

describe('groupPrerequisites', () => {
  test('groups prerequisites and handles multiple codes per group', () => {
    const requisites = [
      { type: 'AND', group_id: 1, code1: 'SOEN1001', code2: 'SOEN1002' },
      { type: 'AND', group_id: 1, code1: 'SOEN1001', code2: 'SOEN1003' },
      { type: 'OR', group_id: 2, code1: 'SOEN2001', code2: 'SOEN2002' },
      { type: 'OR', group_id: 1, code1: 'SOEN1001', code2: 'SOEN1004' }, // Different type, same group_id
    ];

    const result = groupPrerequisites(requisites);

    expect(result).toHaveLength(3);
    expect(result).toContainEqual({
      type: 'AND',
      codes: ['SOEN1002', 'SOEN1003']
    });
    expect(result).toContainEqual({
      type: 'OR', 
      codes: ['SOEN2002']
    });
    expect(result).toContainEqual({
      type: 'OR',
      codes: ['SOEN1004']
    });
  });

  test('uses code1 for grouping when group_id is null or undefined', () => {
    const requisites = [
      { type: 'AND', group_id: null, code1: 'SOEN1001', code2: 'SOEN1002' },
      { type: 'AND', code1: 'SOEN1001', code2: 'SOEN1003' }, // undefined group_id
      { type: 'OR', group_id: null, code1: 'SOEN2001', code2: 'SOEN2002' },
    ];

    const result = groupPrerequisites(requisites);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      type: 'AND',
      codes: ['SOEN1002', 'SOEN1003']
    });
    expect(result).toContainEqual({
      type: 'OR',
      codes: ['SOEN2002']
    });
  });

  test('handles falsy group_id values and mixed scenarios', () => {
    const requisites = [
      { type: 'AND', group_id: 0, code1: 'SOEN1001', code2: 'SOEN1002' }, // falsy group_id
      { type: 'OR', group_id: false, code1: 'SOEN2001', code2: 'SOEN2002' }, // falsy group_id
      { type: 'AND', group_id: 1, code1: 'SOEN3001', code2: 'SOEN3002' }, // truthy group_id
    ];

    const result = groupPrerequisites(requisites);

    expect(result).toHaveLength(3);
    expect(result).toContainEqual({
      type: 'AND',
      codes: ['SOEN1002']
    });
    expect(result).toContainEqual({
      type: 'OR',
      codes: ['SOEN2002']
    });
    expect(result).toContainEqual({
      type: 'AND',
      codes: ['SOEN3002']
    });
  });

  test('handles empty array', () => {
    const result = groupPrerequisites([]);
    expect(result).toEqual([]);
  });
});
