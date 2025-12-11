import {
  CollectionDto,
  CounterDto,
  FilterableParameters,
  SortableParameters,
} from '../input.dto';
import { CollectionResponse, Pagination } from '../output.dto';

export type QueryExecutor<T> = {
  exec(): Promise<T>;
  skip(offset: number): QueryExecutor<T>;
  limit(limit: number): QueryExecutor<T>;
  lean(): any;
  populate(relation: string[] | PopulateOptions[]);
  sort(data: SortableParameters): QueryExecutor<T>;
};

export type PopulateOptions = {
  path: string;
  select?: string[];
  populate?: PopulateOptions[];
};

export type FindOptions = {
  /** Maximum number of documents to return */
  limit?: number;
  /** Number of documents to skip */
  skip?: number;
  /** Sort order */
  sort?: SortableParameters;
  /** Fields to populate */
  populate?: string[] | PopulateOptions[];
  /** Fields to select/project */
  select?: string | string[] | Record<string, number>;
};

export type AggregateExecutor<T> = {
  exec(): Promise<T>;
};

/**
 * Minimal Model interface compatible with Mongoose/Typegoose models.
 * Only includes the methods that are strictly required for DocumentCollector.
 * Additional methods like aggregate, distinct are accessed via runtime checks.
 */
export type Model = {
  countDocuments(query: FilterableParameters): QueryExecutor<number>;
  find<T>(query: FilterableParameters): QueryExecutor<T[]>;
};

export class DocumentCollector<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private model: any) {}

  scopedFilter(
    userFilter: FilterableParameters,
    scope: FilterableParameters,
  ): FilterableParameters {
    if (
      !scope ||
      typeof scope !== 'object' ||
      Object.keys(scope).length === 0
    ) {
      return userFilter;
    }

    // If we have a filter and scope, apply both
    return {
      $and: [userFilter, scope],
    };
  }
  async find(
    query: CollectionDto,
    scope?: FilterableParameters,
    populate?: string[],
  ): Promise<CollectionResponse<T>> {
    const q = this.model
      .find(this.scopedFilter(query.filter, scope) ?? query.filter)
      .populate(populate ?? [])
      .lean()
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);

    if (query.sorter) {
      // ensure at least one field is unique for sorting
      // https://jira.mongodb.org/browse/SERVER-51498
      const sortOptions: SortableParameters =
        '_id' in query.sorter ? query.sorter : { ...query.sorter, _id: 'asc' };
      q.sort(sortOptions);
    }

    const data = (await q.exec()) as T[];
    return {
      data,
      pagination: await this.paginate(query, scope),
    };
  }

  private async paginate(query: CollectionDto, scope?: FilterableParameters) {
    const count: number = await this.count(query, scope);
    const pagination: Pagination = {
      total: count,
      page: query.page,
      limit: query.limit,
      next: query.page * query.limit >= count ? undefined : query.page + 1,
      prev: query.page == 1 ? undefined : query.page - 1,
    };

    return pagination;
  }

  async count(
    query: CounterDto,
    scope?: FilterableParameters,
  ): Promise<number> {
    return this.model
      .countDocuments(this.scopedFilter(query.filter, scope) ?? query.filter)
      .exec();
  }

  /**
   * Find all documents matching filter with optional options
   * Unlike `find()`, this method returns a plain array without pagination structure
   *
   * @param filter - Filter criteria
   * @param scope - Additional scope filters (e.g., workspace, user)
   * @param options - Query options (limit, skip, sort, populate, select)
   * @returns Array of matching documents
   */
  async findAll(
    filter: FilterableParameters = {},
    scope?: FilterableParameters,
    options: FindOptions = {},
  ): Promise<T[]> {
    const q = this.model
      .find(this.scopedFilter(filter, scope) ?? filter)
      .lean();

    if (options.populate) {
      q.populate(options.populate);
    }

    if (options.select && q.select) {
      q.select(options.select);
    }

    if (options.skip) {
      q.skip(options.skip);
    }

    if (options.limit) {
      q.limit(options.limit);
    }

    if (options.sort) {
      // ensure at least one field is unique for sorting
      const sortOptions: SortableParameters =
        '_id' in options.sort ? options.sort : { ...options.sort, _id: 'asc' };
      q.sort(sortOptions);
    }

    return (await q.exec()) as T[];
  }

  /**
   * Find documents with a simple limit (convenience method)
   * Useful for AI tools that need a quick limited result set
   *
   * @param filter - Filter criteria
   * @param limit - Maximum number of documents to return
   * @param scope - Additional scope filters
   * @param populate - Relations to populate
   * @returns Array of matching documents (up to limit)
   */
  async findWithLimit(
    filter: FilterableParameters = {},
    limit: number,
    scope?: FilterableParameters,
    populate?: string[] | PopulateOptions[],
  ): Promise<T[]> {
    return this.findAll(filter, scope, { limit, populate });
  }

  /**
   * Execute an aggregation pipeline
   * Useful for complex queries like grouping, statistics, lookups
   *
   * @param pipeline - MongoDB aggregation pipeline stages
   * @returns Aggregation result
   */
  async aggregate<R = Record<string, unknown>>(
    pipeline: Record<string, unknown>[],
  ): Promise<R[]> {
    if (!this.model.aggregate) {
      throw new Error('Aggregation not supported by this model');
    }
    return this.model.aggregate(pipeline).exec() as Promise<R[]>;
  }

  /**
   * Get distinct values for a field
   *
   * @param field - The field to get distinct values for
   * @param filter - Optional filter to apply
   * @param scope - Additional scope filters
   * @returns Array of distinct values
   */
  async distinct<V = unknown>(
    field: string,
    filter: FilterableParameters = {},
    scope?: FilterableParameters,
  ): Promise<V[]> {
    if (!this.model.distinct) {
      throw new Error('Distinct not supported by this model');
    }
    return this.model.distinct(
      field,
      this.scopedFilter(filter, scope) ?? filter,
    ) as Promise<V[]>;
  }

  /**
   * Check if any documents exist matching the filter
   *
   * @param filter - Filter criteria
   * @param scope - Additional scope filters
   * @returns True if at least one document matches
   */
  async exists(
    filter: FilterableParameters,
    scope?: FilterableParameters,
  ): Promise<boolean> {
    const count = await this.model
      .countDocuments(this.scopedFilter(filter, scope) ?? filter)
      .limit(1)
      .exec();
    return count > 0;
  }

  /**
   * Find one document matching the filter
   *
   * @param filter - Filter criteria
   * @param scope - Additional scope filters
   * @param options - Query options (populate, select)
   * @returns Single document or null
   */
  async findOne(
    filter: FilterableParameters,
    scope?: FilterableParameters,
    options: Pick<FindOptions, 'populate' | 'select'> = {},
  ): Promise<T | null> {
    const results = await this.findAll(filter, scope, {
      ...options,
      limit: 1,
    });
    return results.length > 0 ? results[0] : null;
  }
}
