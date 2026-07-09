import type { BusinessRuleDto, CreateBusinessRuleRequestDto } from '@stratiq/shared';
import type { BusinessRuleRepository } from '../../../../domain/repositories/business-rule.repository.js';
import { toBusinessRuleDto } from '../mappers.js';

export class CreateBusinessRuleUseCase {
  constructor(private readonly businessRules: BusinessRuleRepository) {}

  async execute(organizationId: string, input: CreateBusinessRuleRequestDto): Promise<BusinessRuleDto> {
    const rule = await this.businessRules.create({
      organizationId,
      metricKey: input.metricKey,
      name: input.name,
      comparator: input.comparator,
      thresholdValue: input.thresholdValue,
      severity: input.severity,
      isDefault: false,
    });
    return toBusinessRuleDto(rule);
  }
}
