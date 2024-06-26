/* eslint-disable @typescript-eslint/ban-ts-comment */
import { CollectionProperties } from '../property';
import { Expose } from '../property.decorator';
import { FilterParser } from './parser';
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
        expect(filterParams.name).toEqual({ $regex: '^image/' });
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
