import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { CollectionDto, CounterDto, MAX_LIMIT } from './input.dto';

describe('CounterDto', () => {
  it('should transform filter attribute into object', async () => {
    const payload = {
      filter: '{"userName": {"$regex": "^test"}}',
    };
    const counterDto = plainToClass(CounterDto, payload);
    const errors = await validate(counterDto);
    expect(errors.length).toBe(0);
  });
});

describe('CollectionDto', () => {
  it('should transform filter attribute into object', async () => {
    const payload = {
      filter: '{"userName": {"$regex": "^test"}}',
    };
    const collectionDto = plainToClass(CollectionDto, payload);
    const errors = await validate(collectionDto);
    expect(errors.length).toBe(0);
  });

  it('should allow only string type for sort attribute', async () => {
    const payload = {
      sort: '-createdAt;filename',
    };
    const collectionDto = plainToClass(CollectionDto, payload);
    const errors = await validate(collectionDto);
    expect(errors.length).toBe(0);
  });

  describe('page attribute', () => {
    it('should allow number greater then zero', async () => {
      const payload = {
        page: 1,
      };
      const collectionDto = plainToClass(CollectionDto, payload);
      const errors = await validate(collectionDto);
      expect(errors.length).toBe(0);
    });

    it('should not allow number less than zero', async () => {
      const payload = {
        page: -1,
      };
      const collectionDto = plainToClass(CollectionDto, payload);
      const errors = await validate(collectionDto);
      expect(errors.length).not.toBe(0);
    });

    it('should not allow number equal to zero', async () => {
      const payload = {
        page: 0,
      };
      const collectionDto = plainToClass(CollectionDto, payload);
      const errors = await validate(collectionDto);
      expect(errors.length).not.toBe(0);
    });

    it('should default to 1 if not given', async () => {
      const payload = {};
      const collectionDto = plainToClass(CollectionDto, payload);
      const errors = await validate(collectionDto);
      expect(errors.length).toBe(0);
      expect(collectionDto.page).toBe(1);
    });
  });

  describe('limit attribute', () => {
    it('should allow number greater then zero', async () => {
      const payload = {
        limit: 1,
      };
      const collectionDto = plainToClass(CollectionDto, payload);
      const errors = await validate(collectionDto);
      expect(errors.length).toBe(0);
    });

    it('should not allow number equal zero', async () => {
      const payload = {
        limit: 0,
      };
      const collectionDto = plainToClass(CollectionDto, payload);
      const errors = await validate(collectionDto);
      expect(errors.length).not.toBe(0);
    });

    it('should not allow number less then zero', async () => {
      const payload = {
        limit: -1,
      };
      const collectionDto = plainToClass(CollectionDto, payload);
      const errors = await validate(collectionDto);
      expect(errors.length).not.toBe(0);
    });

    it('should allow the maximum', async () => {
      const dto = plainToClass(CollectionDto, { limit: MAX_LIMIT });
      expect((await validate(dto)).length).toBe(0);
    });

    it('should allow a number just below the maximum', async () => {
      const dto = plainToClass(CollectionDto, { limit: MAX_LIMIT - 1 });
      expect((await validate(dto)).length).toBe(0);
    });

    it('should not allow a number above the maximum', async () => {
      const dto = plainToClass(CollectionDto, { limit: MAX_LIMIT + 1 });
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].property).toBe('limit');
    });

    it('should not allow a query-string limit above the maximum', async () => {
      const dto = plainToClass(CollectionDto, { limit: String(MAX_LIMIT + 1) });
      expect((await validate(dto)).length).not.toBe(0);
    });

    it('should default to 10 if not given', async () => {
      const payload = {};
      const collectionDto = plainToClass(CollectionDto, payload);
      const errors = await validate(collectionDto);
      expect(errors.length).toBe(0);
      expect(collectionDto.limit).toBe(10);
    });
  });
});
