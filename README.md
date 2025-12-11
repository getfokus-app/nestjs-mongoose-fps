# nestjs-mongoose-fps

A filtration, pagination and sorting lib for NestJS v8 using mongoose ORM

This library is fork from [nestjs-mongoose-paginate](https://github.com/fagbokforlaget/nestjs-mongoose-paginate)

# Changes to the original library

- Start page counting from 1 instead of 0.
- Return lean documents instead of Mongoose Documents to be easier for serialization.
- Allow sending extra filters to work with the filter added by the user.
- Allow setting some fields to be populated.
- Allow (`lt`, `lte`, `gt`, `gte`) to work with dates.
- Extended DocumentCollector with additional query methods (`findAll`, `findWithLimit`, `findOne`, `aggregate`, `distinct`, `exists`).
- Extended filter validation schema with more MongoDB operators.

# Usage

### Exposing properties

Create a class to hold information about filterable and sortable properties
You need to `@Expose` properties of this class. By default none of it is filterable nor sortable.
You should set this parameters explicitly.
In case you want to expose some of the properties with a different name, you need to specify a `name` option in this decorator.

```typescript
import { CollectionProperties, Expose } from '@fokus-app/nestjs-mongoose-fps';

export class MyCollectionProperties extends CollectionProperties {
  @Expose({ name: 'createdAt', sortable: true, filterable: true, type: 'date' })
  readonly created_at: 'desc' | 'asc';

  @Expose({ sortable: true, default: true, filterable: true })
  readonly userName: 'desc' | 'asc';

  readonly unsortable: string;
}
```

### Validation Pipe

```typescript
import {
  CollectionDto,
  ValidationPipe,
  CollectionResponse,
} from '@fokus-app/nestjs-mongoose-fps';

@Controller()
export class AppController {
  @Get('list')
  async filter(
    @Query(new ValidationPipe(MyCollectionProperties))
    collectionDto: CollectionDto,
  ): Promise<CollectionResponse<MyDocument>> {
    return await this.service.list(collectionDto);
  }
}
```

### Document collector usage

```typescript
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  CollectionDto,
  DocumentCollector,
  CollectionResponse
} from '@fokus-app/nestjs-mongoose-fps';
import { ObjectId } from 'mongodb';

@Injectable()
export class AppService {
  constructor(
    @InjectModel('MyModel') private readonly model: Model<MyDocument>,
  )

  async list(
      collectionDto: CollectionDto,
  ): Promise<CollectionResponse<MyDocument>> {
    const collector = new DocumentCollector<MyDocument>(this.model);
    const extraFilter = { user: new ObjectId('64c65c8d88c7ccb23521dd39') }
    return collector.find(collectionDto, extraFilter);
  }
}
```

### Extended Query Methods

The `DocumentCollector` class provides additional methods for flexible querying:

#### findAll

Find all documents matching a filter without pagination structure:

```typescript
const collector = new DocumentCollector<MyDocument>(this.model);

// Simple find all with filter
const docs = await collector.findAll({ status: 'active' }, scope);

// With options
const docs = await collector.findAll(
  { status: 'active' },
  scope,
  {
    limit: 100,
    skip: 10,
    sort: { createdAt: 'desc' },
    select: ['name', 'email'],
    populate: ['user']
  }
);
```

#### findWithLimit

Convenience method to find documents with a simple limit:

```typescript
const recentTasks = await collector.findWithLimit(
  { status: 'pending' },
  10,  // limit
  scope,
  ['assignee']  // populate
);
```

#### findOne

Find a single document matching the filter:

```typescript
const task = await collector.findOne(
  { _id: taskId },
  scope,
  { populate: ['bucket'], select: ['title', 'status'] }
);
```

#### exists

Check if any documents match the filter:

```typescript
const hasOverdueTasks = await collector.exists(
  { dueDate: { $lt: new Date() }, status: 'pending' },
  scope
);
```

#### count

Count documents matching a filter:

```typescript
const pendingCount = await collector.count(
  { filter: { status: 'pending' } },
  scope
);
```

#### aggregate

Execute a MongoDB aggregation pipeline:

```typescript
const stats = await collector.aggregate<{ _id: string; count: number }>([
  { $match: { workspace: workspaceId } },
  { $group: { _id: '$status', count: { $sum: 1 } } }
]);
```

#### distinct

Get distinct values for a field:

```typescript
const statuses = await collector.distinct<string>('status', { workspace: workspaceId }, scope);
// Returns: ['pending', 'in-progress', 'completed']
```

# Queries

You may now send a request, like in example below:

```
http://localhost:3000/list?filter={"userName": {"$regex": "^test"}}&sort=-createdAt&page=1&limit=100
```

You need to run the parameters through `urlencode` to be able to parse the query correctly. So the filter part looks more like

`%7B%22userName%22%3A%20%7B%22%24regex%22%3A%20%22%5Etest%22%7D%7D`

### Sort

You can specify more than one field for sorting by providing a list of them separated by a semicolon: `createdAt;userName`.
To use DESC sort order: `-createdAt`.

### Filter

A subset of mongoose query language is supported. The following operators are available:

#### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `$eq` | Equal to | `{ "status": { "$eq": "active" } }` |
| `$ne` | Not equal to | `{ "status": { "$ne": "deleted" } }` |
| `$gt` | Greater than | `{ "age": { "$gt": 18 } }` |
| `$gte` | Greater than or equal | `{ "age": { "$gte": 18 } }` |
| `$lt` | Less than | `{ "age": { "$lt": 65 } }` |
| `$lte` | Less than or equal | `{ "age": { "$lte": 65 } }` |

#### Array Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `$in` | Match any value in array | `{ "status": { "$in": ["active", "pending"] } }` |
| `$nin` | Not match any value in array | `{ "status": { "$nin": ["deleted", "archived"] } }` |
| `$all` | Match all values in array | `{ "tags": { "$all": ["urgent", "important"] } }` |
| `$size` | Match array with exact size | `{ "items": { "$size": 5 } }` |
| `$elemMatch` | Match array element with conditions | `{ "items": { "$elemMatch": { "qty": { "$gt": 10 } } } }` |

#### Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `$and` | Join with AND | `{ "$and": [{ "status": "active" }, { "age": { "$gt": 18 } }] }` |
| `$or` | Join with OR | `{ "$or": [{ "status": "active" }, { "priority": "high" }] }` |
| `$nor` | Join with NOR | `{ "$nor": [{ "status": "deleted" }, { "archived": true }] }` |
| `$not` | Negate expression | `{ "status": { "$not": { "$eq": "deleted" } } }` |

#### Element Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `$exists` | Check field existence | `{ "email": { "$exists": true } }` |
| `$type` | Check BSON type | `{ "age": { "$type": "number" } }` |

#### String Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `$regex` | Pattern matching | `{ "name": { "$regex": "^John" } }` |
| `$regex` with `$options` | Pattern with flags | `{ "name": { "$regex": "john", "$options": "i" } }` |

**Regex Options:**
- `i` - Case-insensitive matching
- `m` - Multiline matching
- `x` - Extended mode (ignore whitespace)
- `s` - Dotall mode (`.` matches newlines)

#### Combined Operators

You can combine multiple operators on the same field:

```json
{ "email": { "$exists": true, "$ne": null } }
{ "age": { "$gt": 18, "$lt": 65 } }
{ "score": { "$gte": 0, "$lte": 100, "$ne": 50 } }
```
