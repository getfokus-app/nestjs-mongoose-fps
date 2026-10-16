import { CollectionProperties } from '../property';
import { CollectionDto, FilterableParameters } from '../input.dto';
import { FilterValidationError } from './validation.error';
import { FilterSchemaValidator } from './validator';

const allowedKeys = [
  '$eq',
  '$gt',
  '$gte',
  '$in',
  '$lt',
  '$lte',
  '$ne',
  '$nin',
  '$and',
  '$not',
  '$nor',
  '$or',
  '$regex',
  '$options',
  '$exists',
  '$all',
  '$size',
  '$elemMatch',
  '$type',
];

/**
 * The longest `$regex` pattern a filter may carry.
 *
 * A pattern arrives from the client and is run against every document in
 * scope, so its size is the client's to choose unless something says no. This
 * is far above what a search box or an exact-title lookup sends — the text is
 * the user's, escaped — and far below the ~32 KB the database itself accepts.
 */
export const MAX_REGEX_LENGTH = 1024;

export class FilterParser {
  constructor(private collectionPropsClass: typeof CollectionProperties) {}

  parse(filter: CollectionDto): FilterableParameters {
    const fltr = this.transform(filter.filter);

    if (fltr === undefined || fltr === null || Object.keys(fltr).length === 0) {
      return {};
    }

    const validator = new FilterSchemaValidator().validate(fltr);
    if (validator) {
      return fltr;
    }
  }

  private transform(v: string | FilterableParameters) {
    if (v instanceof Array) {
      for (const k of v) {
        this.transform(k);
      }
    } else if (v instanceof Object && !(v instanceof Date)) {
      for (const key in v) {
        if (/^\$/.test(key)) {
          this.validateAllowedKey(key, v[key]);
        } else {
          const prop = this.validateProperty(key, v[key]);
          // If the property name is different from the key, we need to
          // transform the key to the property name.
          if (prop !== key) {
            v[prop] = v[key];
            delete v[key];
          }
        }
      }
      // Only its length is judged here. Whether the pattern is VALID is the
      // database's call (it speaks PCRE, which JavaScript's RegExp does not), and
      // the pattern is never rewritten: the collector turns the database's
      // refusal into the same validation error.
      if (
        typeof v['$regex'] === 'string' &&
        v['$regex'].length > MAX_REGEX_LENGTH
      ) {
        throw new FilterValidationError(
          `A $regex pattern may be at most ${MAX_REGEX_LENGTH} characters long.`,
        );
      }
      // Auto-apply case-insensitive flag for $regex when $options is not specified
      if ('$regex' in v && !('$options' in v)) {
        v['$options'] = 'i';
      }
      return v;
    }
  }
  private validateProperty(prop: string, value: any) {
    if (
      !Object.keys(this.collectionPropsClass.prototype.__props).includes(prop)
    ) {
      throw new FilterValidationError(
        `Property '${prop}' is not exposed for filtering.`,
      );
    }

    const propType = this.collectionPropsClass.prototype.__props[prop]?.type;
    if (propType === 'date') {
      if (value instanceof Object) {
        for (const key in value) {
          if (
            value[key] == null ||
            value[key] === 'null' ||
            value[key] === ''
          ) {
            value[key] = null;
          } else {
            value[key] = new Date(value[key]);
          }
        }
      } else if (value == null || value === 'null' || value === '') {
        value = null;
      } else {
        value = new Date(value);
      }
    }

    this.transform(value);

    return this.collectionPropsClass.prototype.__props[prop]?.name ?? prop;
  }

  private validateAllowedKey(key: string, value: any) {
    if (!allowedKeys.includes(key))
      throw new FilterValidationError(
        `Key '${key}' is not allowed for filtering.`,
      );

    this.transform(value);
  }
}
