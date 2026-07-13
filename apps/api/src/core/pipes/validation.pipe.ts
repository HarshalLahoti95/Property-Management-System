import { ValidationPipe, ValidationError, BadRequestException } from '@nestjs/common';

export const globalValidationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors: ValidationError[]) => {
    const formattedErrors = errors.map((error) => ({
      field: error.property,
      errors: Object.values(error.constraints || {}),
    }));
    return new BadRequestException({
      message: 'Validation failed',
      errors: formattedErrors,
    });
  },
});
