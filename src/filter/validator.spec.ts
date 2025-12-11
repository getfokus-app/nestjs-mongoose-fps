import { FilterValidationError } from './validation.error';
import { FilterSchemaValidator } from './validator';

describe('Validator', () => {
  describe('Query', () => {
    const validator = new FilterSchemaValidator();

    it('should be valid', async () => {
      const queries = [
        { mimetype: null },
        { mimetype: 'audio' },
        { mimetype: ['audio', 'video', true] },
        { mimetype: true },
        { created_at: { $gt: '2023-12-31' } },
        { mimetype: { $eq: true } },
        { mimetype: { $eq: 'audio' } },
        { mimetype: { $regex: '^audio/' } },
        { mimetype: { $regex: '^audio/', $options: 'i' } },
        { mimetype: { $in: ['audio/mp3', 'aduio/mp4'] } },
        { mimetype: { $not: { $in: ['audio/mp3', 'aduio/mp4'] } } },
        { $and: [{ mimetype: 'audio' }, { mimetype: 'video' }] },
        {
          $or: [
            {
              $and: [{ mimetype: { $eq: 'audio' } }, { length: 3 }],
            },
            {
              mimetype: { $not: { $regex: 'video' } },
            },
          ],
        },
      ];

      queries.forEach((query) => {
        expect(validator.validate(query)).toBe(true);
      });
    });

    it('should allow date queries', async () => {
      const queries = [
        { created_at: { $gt: '2023-12-31' } },
        { created_at: { $gte: '2023-12-31' } },
        { created_at: { $lt: '2023-12-31' } },
        { created_at: { $lte: '2023-12-31' } },
      ];

      queries.forEach((query) => {
        expect(validator.validate(query)).toBe(true);
      });
    });

    it('should allow nested queries', async () => {
      const queries = [
        {
          $and: [
            { created_at: { $gt: '2023-12-31' } },
            {
              $or: [
                { created_at: { $lt: '2023-12-31' } },
                { created_at: { $eq: 'null' } },
              ],
            },
          ],
        },
      ];

      queries.forEach((query) => {
        expect(validator.validate(query)).toBe(true);
      });
    });

    describe('regex with options', () => {
      it('should allow regex with valid options', () => {
        const queries = [
          { title: { $regex: 'test' } },
          { title: { $regex: 'test', $options: 'i' } },
          { title: { $regex: '^test$', $options: 'im' } },
          { title: { $regex: 'pattern', $options: 'ims' } },
        ];

        queries.forEach((query) => {
          expect(validator.validate(query)).toBe(true);
        });
      });
    });

    describe('$exists operator', () => {
      it('should allow $exists with boolean', () => {
        const queries = [
          { field: { $exists: true } },
          { field: { $exists: false } },
          { 'nested.field': { $exists: true } },
        ];

        queries.forEach((query) => {
          expect(validator.validate(query)).toBe(true);
        });
      });
    });

    describe('$ne operator (MongoDB style)', () => {
      it('should allow $ne for not equal', () => {
        const queries = [
          { status: { $ne: 'deleted' } },
          { count: { $ne: 0 } },
          { field: { $ne: null } },
          { active: { $ne: false } },
        ];

        queries.forEach((query) => {
          expect(validator.validate(query)).toBe(true);
        });
      });
    });

    describe('$size operator', () => {
      it('should allow $size for array length', () => {
        const queries = [{ tags: { $size: 0 } }, { items: { $size: 5 } }];

        queries.forEach((query) => {
          expect(validator.validate(query)).toBe(true);
        });
      });
    });

    describe('$type operator', () => {
      it('should allow $type for type checking', () => {
        const queries = [
          { field: { $type: 'string' } },
          { field: { $type: 2 } }, // BSON type number
        ];

        queries.forEach((query) => {
          expect(validator.validate(query)).toBe(true);
        });
      });
    });

    describe('$all operator', () => {
      it('should allow $all for array matching', () => {
        const queries = [
          { tags: { $all: ['javascript', 'typescript'] } },
          { categories: { $all: [1, 2, 3] } },
        ];

        queries.forEach((query) => {
          expect(validator.validate(query)).toBe(true);
        });
      });
    });

    describe('$elemMatch operator', () => {
      it('should allow $elemMatch for array element matching', () => {
        const queries = [
          { items: { $elemMatch: { status: 'active' } } },
          { results: { $elemMatch: { score: { $gt: 80 } } } },
        ];

        queries.forEach((query) => {
          expect(validator.validate(query)).toBe(true);
        });
      });
    });

    describe('combined operators', () => {
      it('should allow multiple operators on same field', () => {
        const queries = [
          // Common pattern: { $exists: true, $ne: null }
          { recurringPattern: { $exists: true, $ne: null } },
          // Range query: { $gt: 0, $lt: 100 }
          { score: { $gt: 0, $lt: 100 } },
          { price: { $gte: 10, $lte: 50 } },
          // Combined with $in
          { status: { $exists: true, $in: ['active', 'pending'] } },
        ];

        queries.forEach((query) => {
          expect(validator.validate(query)).toBe(true);
        });
      });

      it('should allow $exists with $not', () => {
        const queries = [{ items: { $exists: true, $not: { $size: 0 } } }];

        queries.forEach((query) => {
          expect(validator.validate(query)).toBe(true);
        });
      });
    });

    describe('underscore-prefixed fields', () => {
      it('should allow fields starting with underscore', () => {
        const queries = [
          { _id: 'some-id' },
          { _createdAt: { $gt: '2023-01-01' } },
        ];

        queries.forEach((query) => {
          expect(validator.validate(query)).toBe(true);
        });
      });
    });

    it('should not be valid', async () => {
      const queries = [
        { $unknown: 'audio' },
        { mimetype: { $unknown: 'audio' } },
        { mimetype: { $in: ['audio/mp3', { $eq: 1 }] } },
        { mimetype: { $regex: { $eq: 'video' } } },
        {
          $or: [
            {
              $and: [{ mimetype: { $eq: 'audio' } }, { length: 3 }],
            },
            {
              mimetype: { $regex: { $eq: 'video' } },
            },
          ],
        },
      ];

      queries.forEach((query) => {
        expect(() => validator.validate(query)).toThrow(FilterValidationError);
      });
    });
  });
});
