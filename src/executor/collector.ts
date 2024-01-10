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
  populate(relation: string[]);
  sort(data: SortableParameters): QueryExecutor<T>;
};

export type Model = {
  countDocuments(query: FilterableParameters): QueryExecutor<number>;
  find<T>(query: FilterableParameters): QueryExecutor<T[]>;
};

export class DocumentCollector<T> {
  constructor(private model: Model) {}

  scopedFilter(
    userFilter: FilterableParameters,
    scope: FilterableParameters,
  ): FilterableParameters {
    if (scope && Object.keys(scope).length === 0) {
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
}
