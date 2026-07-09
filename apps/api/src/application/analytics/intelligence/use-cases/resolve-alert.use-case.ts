import type { AlertDto } from '@stratiq/shared';
import { AlertNotFoundError } from '../../../../domain/errors/intelligence-error.js';
import type { AlertRepository } from '../../../../domain/repositories/alert.repository.js';
import { toAlertDto } from '../mappers.js';

export class ResolveAlertUseCase {
  constructor(private readonly alerts: AlertRepository) {}

  async execute(organizationId: string, alertId: string): Promise<AlertDto> {
    const existing = await this.alerts.findByOrganizationAndId(organizationId, alertId);
    if (!existing) {
      throw new AlertNotFoundError();
    }
    const updated = await this.alerts.updateStatus(alertId, 'RESOLVED', new Date());
    return toAlertDto(updated);
  }
}
