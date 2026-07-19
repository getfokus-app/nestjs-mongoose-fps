export const schema = {
  type: 'object',
  required: ['filter'],
  properties: {
    filter: {
      $ref: '#/definitions/props',
    },
  },
  definitions: {
    // One object; every field independently takes a plain value, an array,
    // a comparison, or a logical expression, and $and/$or/$nor may sit
    // alongside field filters. (Heterogeneous filters — e.g. a plain
    // equality next to an $in — are the normal case for list UIs.)
    props: {
      type: 'object',
      additionalProperties: false,
      patternProperties: {
        '^[$](and|or|nor)$': {
          type: 'array',
          items: {
            $ref: '#/definitions/props',
          },
        },
        '^[a-zA-Z_].*$': {
          anyOf: [
            {
              type: ['string', 'number', 'boolean', 'null'],
            },
            {
              type: 'array',
              items: {
                type: ['string', 'number', 'boolean', 'null'],
              },
            },
            {
              $ref: '#/definitions/comparison',
            },
            {
              $ref: '#/definitions/logical',
            },
          ],
        },
      },
    },
    logical: {
      type: 'object',
      additionalProperties: false,
      properties: {
        $not: {
          $ref: '#/definitions/comparison',
        },
      },
    },
    comparison: {
      anyOf: [
        // Regex pattern with options: { $regex: 'pattern', $options: 'i' }
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            $regex: {
              type: 'string',
            },
            $options: {
              type: 'string',
              pattern: '^[imxs]*$', // Valid regex flags: i (case-insensitive), m (multiline), x (extended), s (dotall)
            },
          },
          required: ['$regex'],
        },
        // Equality operators: $eq, $ne (MongoDB uses $ne, not $neq)
        {
          type: 'object',
          additionalProperties: false,
          patternProperties: {
            '^[$](eq|ne|neq)$': {
              type: ['string', 'number', 'boolean', 'null'],
            },
          },
        },
        // Comparison operators: $gt, $gte, $lt, $lte
        {
          type: 'object',
          additionalProperties: false,
          patternProperties: {
            '^[$](gt|gte|lt|lte)$': {
              type: ['string', 'number', 'object'],
            },
          },
        },
        // Array operators: $in, $nin, $all (null allowed — matches
        // documents where the field is null or missing)
        {
          type: 'object',
          additionalProperties: false,
          patternProperties: {
            '^[$](in|nin|all)$': {
              type: 'array',
              items: {
                type: ['string', 'number', 'boolean', 'null'],
              },
            },
          },
        },
        // Existence check: { $exists: true/false }
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            $exists: {
              type: 'boolean',
            },
          },
        },
        // Array size: { $size: number }
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            $size: {
              type: 'number',
              minimum: 0,
            },
          },
        },
        // Type check: { $type: 'string' | number }
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            $type: {
              type: ['string', 'number'],
            },
          },
        },
        // Combined operators: { $exists: true, $ne: null } or { $gt: 0, $lt: 100 }
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            $exists: {
              type: 'boolean',
            },
            $ne: {
              type: ['string', 'number', 'boolean', 'null'],
            },
            $eq: {
              type: ['string', 'number', 'boolean', 'null'],
            },
            $gt: {
              type: ['string', 'number', 'object'],
            },
            $gte: {
              type: ['string', 'number', 'object'],
            },
            $lt: {
              type: ['string', 'number', 'object'],
            },
            $lte: {
              type: ['string', 'number', 'object'],
            },
            $in: {
              type: 'array',
              items: {
                type: ['string', 'number', 'boolean', 'null'],
              },
            },
            $nin: {
              type: 'array',
              items: {
                type: ['string', 'number', 'boolean', 'null'],
              },
            },
            $not: {
              $ref: '#/definitions/comparison',
            },
          },
        },
        // Element match for arrays: { $elemMatch: { field: value } }
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            $elemMatch: {
              $ref: '#/definitions/props',
            },
          },
        },
      ],
    },
  },
};
