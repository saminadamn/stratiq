import type { BusinessRuleDto, UpdateBusinessRuleRequestDto } from '@stratiq/shared';
import { BusinessRuleNotFoundError } from '../../../../domain/errors/intelligence-error.js';
import type { BusinessRuleRepository } from '../../../../domain/repositories/business-rule.repository.js';
import { toBusinessRuleDto } from '../mappers.js';

export class UpdateBusinessRuleUseCase {
  constructor(private readonly businessRules: BusinessRuleRepository) {}

  async execute(
    organizationId: string,
    ruleId: string,
    input: UpdateBusinessRuleRequestDto,
  ): Promise<BusinessRuleDto> {
    const existing = await this.businessRules.findByOrganizationAndId(organizationId, ruleId);
    if (!existing) {
      throw new BusinessRuleNotFoundError();
    }
    const updated = await this.businessRules.update(ruleId, input);
    return toBusinessRuleDto(updated);
  }
}
