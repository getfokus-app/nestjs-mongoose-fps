export const schema = {
  type: 'object',
  required: ['filter'],
  properties: {
    filter: {
      $ref: '#/definitions/props',
    },
  },
  definitions: {
    props: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          patternProperties: {
            '^[a-zA-Z_].*$': {
              type: ['string', 'number', 'boolean', 'null'],
            },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          patternProperties: {
            '^[a-zA-Z_].*$': {
              $ref: '#/definitions/comparison',
            },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          patternProperties: {
            '^[a-zA-Z_].*$': {
              type: 'array',
              items: {
                type: ['string', 'number', 'boolean'],
              },
            },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          patternProperties: {
            '^[a-zA-Z_].*$': {
              $ref: '#/definitions/logical',
            },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          patternProperties: {
            '[$](and|or|nor)$': {
              type: 'array',
              items: {
                $ref: '#/definitions/props',
              },
            },
          },
        },
      ],
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
        // Array operators: $in, $nin, $all
        {
          type: 'object',
          additionalProperties: false,
          patternProperties: {
            '^[$](in|nin|all)$': {
              type: 'array',
              items: {
                type: ['string', 'number', 'boolean'],
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
                type: ['string', 'number', 'boolean'],
              },
            },
            $nin: {
              type: 'array',
              items: {
                type: ['string', 'number', 'boolean'],
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
