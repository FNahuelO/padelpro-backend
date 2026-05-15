export class CreateCircuitDto {
  name: string;
  description?: string;
  season?: string;
  startDate?: string;
  endDate?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';
}
