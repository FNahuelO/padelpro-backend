export class CreateCircuitStageDto {
  clubId: string;
  categoryId?: string;
  tournamentId?: string;
  name?: string;
  startDate: string;
  endDate?: string;
  sortOrder?: number;
}
