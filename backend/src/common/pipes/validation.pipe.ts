import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name);

  transform(value: any, metadata: ArgumentMetadata) {
    if (!value && metadata.type !== 'custom') {
      this.logger.warn(
        `Validation failed for ${metadata.type}: No value provided`,
      );
      throw new BadRequestException({
        statusCode: 400,
        message: `No value provided for ${metadata.data || 'field'}`,
        field: metadata.data,
      });
    }

    // Add additional validation logic here if needed
    return value;
  }
}
