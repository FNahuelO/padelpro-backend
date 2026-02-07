export declare class AvailabilitySlotDto {
    dayOfWeek: number;
    startHour: number;
    endHour: number;
}
export declare class SetAvailabilityDto {
    availabilities: AvailabilitySlotDto[];
}
export declare class UpdateAvailabilitySlotDto {
    dayOfWeek?: number;
    startHour?: number;
    endHour?: number;
}
