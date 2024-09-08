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
          patternProperties: {
            '^[a-zA-Z].*$': {
              type: ['string', 'number', 'boolean', 'null'],
            },
          },
        },
        {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z].*$': {
              $ref: '#/definitions/comparison',
            },
          },
        },
        {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z].*$': {
              type: 'array',
              items: {
                type: ['string', 'number', 'boolean'],
              },
            },
          },
        },
        {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z].*$': {
              $ref: '#/definitions/logical',
            },
          },
        },
        {
          type: 'object',
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
      properties: {
        $not: {
          $ref: '#/definitions/comparison',
        },
      },
    },
    comparison: {
      anyOf: [
        {
          type: 'object',
          properties: {
            $regex: {
              type: 'string',
            },
            $options: {
              type: 'string',
            },
          },
        },
        {
          type: 'object',
          patternProperties: {
            '^[$](eq|neq)$': {
              type: ['string', 'number', 'boolean', 'null'],
            },
          },
        },
        {
          type: 'object',
          patternProperties: {
            '^[$](gt|gte|lt|lte)$': {
              type: ['string', 'number', 'object'],
            },
          },
        },
        {
          type: 'object',
          patternProperties: {
            '^[$](in|nin)$': {
              type: 'array',
              items: {
                type: ['string', 'number', 'boolean'],
              },
            },
          },
        },
      ],
    },
  },
};
