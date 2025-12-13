import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export class SendEtherValidation implements PipeTransform {
  constructor(private schema: ZodSchema) {
    console.log('SendEtherValidation pipe instantiated with schema:', !!schema);
  }

  transform(value: unknown): unknown {
    try {
      console.log('Transform called, schema exists:', !!this.schema);
      const parsedValue = this.schema.parse(value) as unknown;
      return parsedValue;
    } catch (error) {
      // Log the actual validation error details with proper type checking
      if (error instanceof ZodError) {
        console.error('Zod validation issues:', error.issues);
      }
      console.error('Validation error details:', error);
      throw new BadRequestException(
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
