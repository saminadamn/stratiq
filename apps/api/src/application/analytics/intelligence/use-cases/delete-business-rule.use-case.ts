import { BusinessRuleNotFoundError } from '../../../../domain/errors/intelligence-error.js';
import type { BusinessRuleRepository } from '../../../../domain/repositories/business-rule.repository.js';

export class DeleteBusinessRuleUseCase {
  constructor(private readonly businessRules: BusinessRuleRepository) {}

  async execute(organizationId: string, ruleId: string): Promise<void> {
    const existing = await this.businessRules.findByOrganizationAndId(organizationId, ruleId);
    if (!existing) {
      throw new BusinessRuleNotFoundError();
    }
    await this.businessRules.delete(ruleId);
  }
}
