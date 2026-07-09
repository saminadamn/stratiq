import type { BusinessRuleDto } from '@stratiq/shared';
import type { BusinessRuleRepository } from '../../../../domain/repositories/business-rule.repository.js';
import { ensureDefaultBusinessRules } from '../ensure-default-business-rules.js';
import { toBusinessRuleDto } from '../mappers.js';

export class ListBusinessRulesUseCase {
  constructor(private readonly businessRules: BusinessRuleRepository) {}

  async execute(organizationId: string): Promise<BusinessRuleDto[]> {
    const rules = await ensureDefaultBusinessRules(this.businessRules, organizationId);
    return rules.map(toBusinessRuleDto);
  }
}
