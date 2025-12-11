import { DocumentCollector, QueryExecutor, Model, FindOptions, PopulateOptions } from './collector';

const data = [
  { id: 1, name: 'one' },
  { id: 2, name: 'two' },
  { id: 3, name: 'three' },
  { id: 4, name: 'four' },
  { id: 5, name: 'five' },
  { id: 6, name: 'six' },
];

// Tracking query executor that records method calls
class TrackingQueryExecutor implements QueryExecutor<any> {
  public calls: { method: string; args: any[] }[] = [];

  constructor(private obj: any) {}

  async exec(): Promise<any> {
    this.calls.push({ method: 'exec', args: [] });
    return this.obj;
  }
  skip(offset: number): TrackingQueryExecutor {
    this.calls.push({ method: 'skip', args: [offset] });
    return this;
  }
  limit(limit: number): TrackingQueryExecutor {
    this.calls.push({ method: 'limit', args: [limit] });
    return this;
  }
  sort(data: any): TrackingQueryExecutor {
    this.calls.push({ method: 'sort', args: [data] });
    return this;
  }
  lean(): TrackingQueryExecutor {
    this.calls.push({ method: 'lean', args: [] });
    return this;
  }
  populate(relation: any): TrackingQueryExecutor {
    this.calls.push({ method: 'populate', args: [relation] });
    return this;
  }
  select(fields: any): TrackingQueryExecutor {
    this.calls.push({ method: 'select', args: [fields] });
    return this;
  }
}

class MyQueryExecutor implements QueryExecutor<any> {
  constructor(private obj: any) {}

  async exec(): Promise<any> {
    return this.obj;
  }
  skip(): MyQueryExecutor {
    return this;
  }
  limit(): MyQueryExecutor {
    return this;
  }
  sort(): MyQueryExecutor {
    return this;
  }
  lean(): MyQueryExecutor {
    return this;
  }
  populate(): MyQueryExecutor {
    return this;
  }
  select(): MyQueryExecutor {
    return this;
  }
}

class MyModel implements Model {
  countDocuments(): QueryExecutor<number> {
    return new MyQueryExecutor(100);
  }
  find(): MyQueryExecutor {
    return new MyQueryExecutor(data);
  }
  aggregate<T>(pipeline: Record<string, unknown>[]): { exec: () => Promise<T[]> } {
    return {
      exec: async () => [{ count: 6, avgId: 3.5 }] as T[],
    };
  }
  distinct(field: string, filter?: Record<string, unknown>): Promise<unknown[]> {
    return Promise.resolve(['one', 'two', 'three', 'four', 'five', 'six']);
  }
}

describe('Executor', () => {
  describe('Collector', () => {
    describe('find() - paginated query', () => {
      it('should return proper paginated data', async () => {
        const model = new MyModel();
        const collector = new DocumentCollector(model);
        const result = await collector.find({
          filter: {},
          sorter: {},
          page: 1,
          limit: 10,
        });

        expect(result).toHaveProperty('data');
        expect(result.data).toEqual(data);
        expect(result).toHaveProperty('pagination');
        expect(result.pagination).toHaveProperty('total');
        expect(result.pagination).toHaveProperty('page');
        expect(result.pagination).toHaveProperty('limit');
      });

      it('should calculate pagination correctly', async () => {
        const model = new MyModel();
        const collector = new DocumentCollector(model);
        const result = await collector.find({
          filter: {},
          page: 2,
          limit: 10,
        });

        expect(result.pagination.page).toBe(2);
        expect(result.pagination.limit).toBe(10);
        expect(result.pagination.total).toBe(100);
        expect(result.pagination.prev).toBe(1);
      });
    });

    describe('findAll() - unpaginated query', () => {
      it('should return all documents as plain array', async () => {
        const model = new MyModel();
        const collector = new DocumentCollector(model);
        const result = await collector.findAll({});

        expect(result).toEqual(data);
        expect(Array.isArray(result)).toBe(true);
        expect(result).not.toHaveProperty('pagination');
      });

      it('should apply limit option', async () => {
        const queryExecutor = new TrackingQueryExecutor(data.slice(0, 3));
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => queryExecutor,
        };
        const collector = new DocumentCollector(model);

        await collector.findAll({}, undefined, { limit: 3 });

        expect(queryExecutor.calls.some((c) => c.method === 'limit' && c.args[0] === 3)).toBe(true);
      });

      it('should apply skip option', async () => {
        const queryExecutor = new TrackingQueryExecutor(data.slice(2));
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => queryExecutor,
        };
        const collector = new DocumentCollector(model);

        await collector.findAll({}, undefined, { skip: 2 });

        expect(queryExecutor.calls.some((c) => c.method === 'skip' && c.args[0] === 2)).toBe(true);
      });

      it('should apply sort option', async () => {
        const queryExecutor = new TrackingQueryExecutor(data);
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => queryExecutor,
        };
        const collector = new DocumentCollector(model);

        await collector.findAll({}, undefined, { sort: { id: 'desc' } });

        const sortCall = queryExecutor.calls.find((c) => c.method === 'sort');
        expect(sortCall).toBeDefined();
        expect(sortCall.args[0]).toHaveProperty('id', 'desc');
      });

      it('should apply populate option with string array', async () => {
        const queryExecutor = new TrackingQueryExecutor(data);
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => queryExecutor,
        };
        const collector = new DocumentCollector(model);

        await collector.findAll({}, undefined, { populate: ['relation1', 'relation2'] });

        const populateCall = queryExecutor.calls.find((c) => c.method === 'populate');
        expect(populateCall).toBeDefined();
        expect(populateCall.args[0]).toEqual(['relation1', 'relation2']);
      });

      it('should apply populate option with PopulateOptions', async () => {
        const queryExecutor = new TrackingQueryExecutor(data);
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => queryExecutor,
        };
        const collector = new DocumentCollector(model);

        const populateOptions: PopulateOptions[] = [
          { path: 'relation1', select: ['field1', 'field2'] },
        ];
        await collector.findAll({}, undefined, { populate: populateOptions });

        const populateCall = queryExecutor.calls.find((c) => c.method === 'populate');
        expect(populateCall).toBeDefined();
        expect(populateCall.args[0]).toEqual(populateOptions);
      });

      it('should apply select option', async () => {
        const queryExecutor = new TrackingQueryExecutor(data);
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => queryExecutor,
        };
        const collector = new DocumentCollector(model);

        await collector.findAll({}, undefined, { select: ['id', 'name'] });

        const selectCall = queryExecutor.calls.find((c) => c.method === 'select');
        expect(selectCall).toBeDefined();
        expect(selectCall.args[0]).toEqual(['id', 'name']);
      });

      it('should apply all options together', async () => {
        const queryExecutor = new TrackingQueryExecutor(data);
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => queryExecutor,
        };
        const collector = new DocumentCollector(model);

        const options: FindOptions = {
          limit: 5,
          skip: 1,
          sort: { id: 'desc' },
          populate: ['relation'],
          select: ['id', 'name'],
        };
        await collector.findAll({}, undefined, options);

        expect(queryExecutor.calls.some((c) => c.method === 'limit')).toBe(true);
        expect(queryExecutor.calls.some((c) => c.method === 'skip')).toBe(true);
        expect(queryExecutor.calls.some((c) => c.method === 'sort')).toBe(true);
        expect(queryExecutor.calls.some((c) => c.method === 'populate')).toBe(true);
        expect(queryExecutor.calls.some((c) => c.method === 'select')).toBe(true);
      });

      it('should apply scope filter with $and', async () => {
        let capturedFilter: any;
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: (filter) => {
            capturedFilter = filter;
            return new MyQueryExecutor(data);
          },
        };
        const collector = new DocumentCollector(model);

        await collector.findAll({ name: 'one' }, { workspace: 'ws-123' });

        expect(capturedFilter).toHaveProperty('$and');
        expect(capturedFilter.$and).toContainEqual({ name: 'one' });
        expect(capturedFilter.$and).toContainEqual({ workspace: 'ws-123' });
      });
    });

    describe('findWithLimit() - convenience method', () => {
      it('should call findAll with limit option', async () => {
        const model = new MyModel();
        const collector = new DocumentCollector(model);
        const result = await collector.findWithLimit({}, 3);

        expect(result).toEqual(data);
        expect(Array.isArray(result)).toBe(true);
      });

      it('should pass populate option to findAll', async () => {
        const queryExecutor = new TrackingQueryExecutor(data);
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => queryExecutor,
        };
        const collector = new DocumentCollector(model);

        await collector.findWithLimit({}, 5, undefined, ['relation']);

        expect(queryExecutor.calls.some((c) => c.method === 'populate')).toBe(true);
        expect(queryExecutor.calls.some((c) => c.method === 'limit')).toBe(true);
      });
    });

    describe('aggregate() - aggregation pipeline', () => {
      it('should execute aggregation pipeline', async () => {
        const model = new MyModel();
        const collector = new DocumentCollector(model);
        const result = await collector.aggregate([
          { $group: { _id: null, count: { $sum: 1 }, avgId: { $avg: '$id' } } },
        ]);

        expect(result).toEqual([{ count: 6, avgId: 3.5 }]);
      });

      it('should throw error if aggregate not supported', async () => {
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => new MyQueryExecutor(data),
          // No aggregate method
        };
        const collector = new DocumentCollector(model);

        await expect(collector.aggregate([])).rejects.toThrow(
          'Aggregation not supported by this model',
        );
      });

      it('should pass pipeline to model aggregate', async () => {
        let capturedPipeline: any;
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => new MyQueryExecutor(data),
          aggregate: (pipeline) => {
            capturedPipeline = pipeline;
            return { exec: async () => [] };
          },
        };
        const collector = new DocumentCollector(model);

        const pipeline = [
          { $match: { status: 'active' } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
        ];
        await collector.aggregate(pipeline);

        expect(capturedPipeline).toEqual(pipeline);
      });
    });

    describe('distinct() - distinct values', () => {
      it('should return distinct values for a field', async () => {
        const model = new MyModel();
        const collector = new DocumentCollector(model);
        const result = await collector.distinct('name');

        expect(result).toEqual(['one', 'two', 'three', 'four', 'five', 'six']);
      });

      it('should throw error if distinct not supported', async () => {
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => new MyQueryExecutor(data),
          // No distinct method
        };
        const collector = new DocumentCollector(model);

        await expect(collector.distinct('name')).rejects.toThrow(
          'Distinct not supported by this model',
        );
      });

      it('should pass filter and scope to distinct', async () => {
        let capturedField: string;
        let capturedFilter: any;
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => new MyQueryExecutor(data),
          distinct: (field, filter) => {
            capturedField = field;
            capturedFilter = filter;
            return Promise.resolve([]);
          },
        };
        const collector = new DocumentCollector(model);

        await collector.distinct('category', { status: 'active' }, { workspace: 'ws-123' });

        expect(capturedField).toBe('category');
        expect(capturedFilter).toHaveProperty('$and');
      });
    });

    describe('exists() - existence check', () => {
      it('should return true when documents exist', async () => {
        const model = new MyModel();
        const collector = new DocumentCollector(model);
        const result = await collector.exists({ id: 1 });

        expect(result).toBe(true);
      });

      it('should return false when no documents exist', async () => {
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(0),
          find: () => new MyQueryExecutor([]),
        };
        const collector = new DocumentCollector(model);
        const result = await collector.exists({ id: 999 });

        expect(result).toBe(false);
      });

      it('should apply scope filter', async () => {
        let capturedFilter: any;
        const model: Model = {
          countDocuments: (filter) => {
            capturedFilter = filter;
            return new MyQueryExecutor(1);
          },
          find: () => new MyQueryExecutor([]),
        };
        const collector = new DocumentCollector(model);

        await collector.exists({ id: 1 }, { workspace: 'ws-123' });

        expect(capturedFilter).toHaveProperty('$and');
      });
    });

    describe('findOne() - single document', () => {
      it('should find one document', async () => {
        const model = new MyModel();
        const collector = new DocumentCollector(model);
        const result = await collector.findOne({ id: 1 });

        expect(result).toEqual(data[0]);
      });

      it('should return null when no documents match', async () => {
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(0),
          find: () => new MyQueryExecutor([]),
        };
        const collector = new DocumentCollector(model);
        const result = await collector.findOne({ id: 999 });

        expect(result).toBeNull();
      });

      it('should apply populate option', async () => {
        const queryExecutor = new TrackingQueryExecutor(data);
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => queryExecutor,
        };
        const collector = new DocumentCollector(model);

        await collector.findOne({ id: 1 }, undefined, { populate: ['relation'] });

        expect(queryExecutor.calls.some((c) => c.method === 'populate')).toBe(true);
      });

      it('should apply select option', async () => {
        const queryExecutor = new TrackingQueryExecutor(data);
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => queryExecutor,
        };
        const collector = new DocumentCollector(model);

        await collector.findOne({ id: 1 }, undefined, { select: ['id'] });

        expect(queryExecutor.calls.some((c) => c.method === 'select')).toBe(true);
      });

      it('should limit to 1 document', async () => {
        const queryExecutor = new TrackingQueryExecutor(data);
        const model: Model = {
          countDocuments: () => new MyQueryExecutor(100),
          find: () => queryExecutor,
        };
        const collector = new DocumentCollector(model);

        await collector.findOne({ id: 1 });

        const limitCall = queryExecutor.calls.find((c) => c.method === 'limit');
        expect(limitCall).toBeDefined();
        expect(limitCall.args[0]).toBe(1);
      });
    });

    describe('count() - document count', () => {
      it('should return count of matching documents', async () => {
        const model = new MyModel();
        const collector = new DocumentCollector(model);
        const result = await collector.count({ filter: {} });

        expect(result).toBe(100);
      });

      it('should apply scope filter', async () => {
        let capturedFilter: any;
        const model: Model = {
          countDocuments: (filter) => {
            capturedFilter = filter;
            return new MyQueryExecutor(50);
          },
          find: () => new MyQueryExecutor([]),
        };
        const collector = new DocumentCollector(model);

        await collector.count({ filter: { status: 'active' } }, { workspace: 'ws-123' });

        expect(capturedFilter).toHaveProperty('$and');
      });
    });

    describe('scopedFilter() - filter combination', () => {
      it('should return userFilter when scope is empty', () => {
        const model = new MyModel();
        const collector = new DocumentCollector(model);

        const result = collector.scopedFilter({ id: 1 }, {});
        expect(result).toEqual({ id: 1 });
      });

      it('should return userFilter when scope is undefined', () => {
        const model = new MyModel();
        const collector = new DocumentCollector(model);

        const result = collector.scopedFilter({ id: 1 }, undefined);
        expect(result).toEqual({ id: 1 });
      });

      it('should combine filter and scope with $and', () => {
        const model = new MyModel();
        const collector = new DocumentCollector(model);

        const result = collector.scopedFilter({ id: 1 }, { workspace: 'ws-123' });
        expect(result).toHaveProperty('$and');
        expect(result.$and).toContainEqual({ id: 1 });
        expect(result.$and).toContainEqual({ workspace: 'ws-123' });
      });
    });
  });
});
