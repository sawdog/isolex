import * as Ajv from 'ajv';

import { SCHEMA_KEYWORD_REGEXP } from 'src/schema/keyword/Regexp';

/* tslint:disable-next-line:no-var-requires */
export const SCHEMA_GLOBAL = require('src/schema/schema.yml');

export interface SchemaResult {
  errors: Array<string>;
  valid: boolean;
}

export class Schema {
  public static formatError(err: Ajv.ErrorObject): string {
    switch (err.keyword) {
      case 'additionalProperties':
        const params = err.params as Ajv.AdditionalPropertiesParams;
        return `${err.message}: ${params.additionalProperty} at ${err.dataPath} not expected in ${err.schemaPath}`;
      default:
        return `${err.message} at ${err.schemaPath}`;
    }
  }

  protected compiler: Ajv.Ajv;

  constructor(schema: object = SCHEMA_GLOBAL) {
    this.compiler = new Ajv({
      allErrors: true,
      coerceTypes: 'array',
      missingRefs: 'fail',
      removeAdditional: 'failing',
      schemaId: 'auto',
      useDefaults: true,
      verbose: true,
    });
    this.compiler.addKeyword('regexp', SCHEMA_KEYWORD_REGEXP);
    this.compiler.addSchema(schema, 'isolex');
  }

  public match(value: unknown, ref: string = 'isolex#'): SchemaResult {
    const valid = this.compiler.validate({ $ref: ref }, value);
    if (valid === true) {
      return {
        errors: [],
        valid,
      };
    } else {
      return {
        errors: this.getErrors(),
        valid: false,
      };
    }
  }

  public getErrors(): Array<string> {
    if (Array.isArray(this.compiler.errors)) {
      return this.compiler.errors.map((it) => Schema.formatError(it));
    } else {
      return [];
    }
  }
}
