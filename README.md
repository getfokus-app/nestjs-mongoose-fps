# nestjs-mongoose-fps

A filtration, pagination and sorting lib for NestJS v8 using mongoose ORM

This library is fork from [nestjs-mongoose-paginate](https://github.com/fagbokforlaget/nestjs-mongoose-paginate)

# Changes to the original library

- Start page counting from 1 instead of 0.
- Return lean documents instead of Mongoose Documents to be easier for serialization.
- Allow sending extra filters to work with the filter added by the user.
- Allow setting some fields to be populated.
- Allow (`lt`, `lte`, `gt`, `gte`) to work with dates.

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

A subset of mongoose query language is supported. Currently only these operators are supported:

`'$eq', '$gt', '$gte', '$in', '$lt', '$lte', '$ne', '$nin', '$and', '$not', '$nor', '$or', '$regex'`
