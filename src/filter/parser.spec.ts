/* eslint-disable @typescript-eslint/ban-ts-comment */
import { CollectionProperties } from '../property';
import { Expose } from '../property.decorator';
import { FilterParser, MAX_REGEX_LENGTH } from './parser';
import { FilterValidationError } from './validation.error';

class User extends CollectionProperties {
  @Expose({ filterable: true })
  name: string;

  @Expose({ filterable: true })
  id?: number;

  @Expose({ filterable: true, type: 'date' })
  created_at?: string;

  @Expose({ name: 'typeName', filterable: true })
  type_name: string;

  @Expose({ filterable: false })
  unfilterable: string;
}

describe('Filter', () => {
  describe('Parser', () => {
    describe('with allowed keys', () => {
      it('should process known property', async () => {
        const filterParams = new FilterParser(User).parse({
          filter: { name: 'image' },
        });

        expect(filterParams).toHaveProperty('name');
        expect(filterParams.name).toEqual('image');
      });

      it('should process known property', async () => {
        const filterParams = new FilterParser(User).parse({
          filter: { id: 1 },
        });

        expect(filterParams).toHaveProperty('id');
        expect(filterParams.id).toEqual(1);
      });

      it('should process property with null values', async () => {
        const filterParams = new FilterParser(User).parse({
          filter: { id: null },
        });

        expect(filterParams).toHaveProperty('id');
        expect(filterParams.id).toEqual(null);
      });

      it('should process known property with nested allowed key', async () => {
        const filterParams = new FilterParser(User).parse({
          filter: { name: { $regex: '^image/' } },
        });

        expect(filterParams).toHaveProperty('name');
        expect(filterParams.name).toEqual({ $regex: '^image/', $options: 'i' });
      });

      it('should allow parsing the date field with key $gte', async () => {
        const filterParams = new FilterParser(User).parse({
          filter: { created_at: { $gte: '2019-01-01' } },
        });

        expect(filterParams).toHaveProperty('created_at');
        expect(filterParams.created_at).toEqual({
          $gte: new Date('2019-01-01'),
        });
      });

      it('should process known property inside allowed key', async () => {
        const filterParams = new FilterParser(User).parse({
          filter: { $or: [{ name: { $regex: '^image/' } }] },
        });

        expect(filterParams).toHaveProperty('$or');
        // @ts-ignore
        expect(filterParams.$or.length).toEqual(1);
      });

      it('should throw an error for unknown property', async () => {
        expect(() =>
          new FilterParser(User).parse({
            filter: { unknown: { $regex: '^image/' } },
          }),
        ).toThrow(FilterValidationError);
      });

      it('should rename property', async () => {
        const filterParams = new FilterParser(User).parse({
          filter: { typeName: { $regex: '^image/' } },
        });

        expect(filterParams).toHaveProperty('type_name');
      });
    });

    describe('with a $regex', () => {
      it('takes a pattern of the longest allowed length', async () => {
        const pattern = 'a'.repeat(MAX_REGEX_LENGTH);

        const filterParams = new FilterParser(User).parse({
          filter: { name: { $regex: pattern } },
        });

        expect(filterParams.name).toEqual({ $regex: pattern, $options: 'i' });
      });

      it('refuses a longer pattern as an invalid filter', async () => {
        const parse = () =>
          new FilterParser(User).parse({
            filter: { name: { $regex: 'a'.repeat(MAX_REGEX_LENGTH + 1) } },
          });

        expect(parse).toThrow(FilterValidationError);
        expect(parse).toThrow(
          `A $regex pattern may be at most ${MAX_REGEX_LENGTH} characters long.`,
        );
      });

      it('refuses a longer pattern wherever it sits in the filter', async () => {
        const pattern = 'a'.repeat(MAX_REGEX_LENGTH + 1);

        expect(() =>
          new FilterParser(User).parse({
            filter: { $or: [{ id: 1 }, { name: { $regex: pattern } }] },
          }),
        ).toThrow(FilterValidationError);
        expect(() =>
          new FilterParser(User).parse({
            filter: { name: { $not: { $regex: pattern } } },
          }),
        ).toThrow(FilterValidationError);
      });

      // Whether a pattern is VALID is the database's call, not this parser's:
      // MongoDB speaks PCRE, and each of these is fine there while JavaScript's
      // own RegExp refuses it. A pattern must reach the query as it was sent.
      it.each(['(?i)^john', 'a++b', '(?>a+)b', '(?P<first>jo)hn', '^john$'])(
        'passes %s through untouched',
        async (pattern) => {
          const filterParams = new FilterParser(User).parse({
            filter: { name: { $regex: pattern, $options: 'm' } },
          });

          expect(filterParams.name).toEqual({ $regex: pattern, $options: 'm' });
        },
      );
    });

    describe('with the array and element operators', () => {
      it.each([
        ['$exists', { $exists: true }],
        ['$exists', { $exists: false }],
        ['$all', { $all: ['a', 'b'] }],
        ['$size', { $size: 3 }],
        ['$type', { $type: 'string' }],
        ['$type', { $type: 2 }],
        ['$elemMatch', { $elemMatch: { name: 'image' } }],
      ])('accepts %s', (_op, value) => {
        expect(
          new FilterParser(User).parse({ filter: { name: value } }),
        ).toEqual({
          name: value,
        });
      });

      it.each([
        ['$exists', { $exists: 'yes' }],
        ['$all', { $all: 'a' }],
        ['$size', { $size: -1 }],
        ['$size', { $size: 'three' }],
        ['$type', { $type: true }],
        ['$elemMatch', { $elemMatch: 'x' }],
      ])('refuses a bad value for %s', (_op, value) => {
        expect(() =>
          new FilterParser(User).parse({ filter: { name: value } }),
        ).toThrow();
      });

      it.each(['$where', '$function', '$expr', '$accumulator'])(
        'refuses %s nested directly in $elemMatch',
        (op) => {
          expect(() =>
            new FilterParser(User).parse({
              filter: { name: { $elemMatch: { [op]: 'this.a == 1' } } },
            }),
          ).toThrow(FilterValidationError);
        },
      );

      it('refuses a disallowed operator deep inside $elemMatch', () => {
        expect(() =>
          new FilterParser(User).parse({
            filter: {
              name: {
                $elemMatch: {
                  $or: [{ id: { $elemMatch: { $where: 'sleep(1000)' } } }],
                },
              },
            },
          }),
        ).toThrow(FilterValidationError);
        expect(() =>
          new FilterParser(User).parse({
            filter: {
              name: { $elemMatch: { name: { $expr: { $eq: [1, 1] } } } },
            },
          }),
        ).toThrow(FilterValidationError);
      });

      it('refuses a property that is not exposed inside $elemMatch', () => {
        expect(() =>
          new FilterParser(User).parse({
            filter: { name: { $elemMatch: { nonexistent: 'x' } } },
          }),
        ).toThrow(FilterValidationError);
      });
    });

    describe('with not allowed keys', () => {
      it('should throw error', async () => {
        expect(() =>
          new FilterParser(User).parse({
            filter: { name: { $unknown: '^image/' } },
          }),
        ).toThrow(FilterValidationError);
      });

      it('should process known property inside allowed key', async () => {
        expect(() =>
          new FilterParser(User).parse({
            filter: { $or: [{ name: { $unknown: '^image/' } }] },
          }),
        ).toThrow(FilterValidationError);
      });
    });
  });
});
