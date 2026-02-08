import { AvailabilityService } from './availability.service';
import { SetAvailabilityDto, AvailabilitySlotDto, UpdateAvailabilitySlotDto } from './dto/set-availability.dto';
export declare class AvailabilityController {
    private availabilityService;
    constructor(availabilityService: AvailabilityService);
    setAvailability(user: any, dto: SetAvailabilityDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        startHour: number;
        endHour: number;
        userId: string;
        dayOfWeek: number;
    }[]>;
    getMyAvailability(user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        startHour: number;
        endHour: number;
        userId: string;
        dayOfWeek: number;
    }[]>;
    addSlot(user: any, dto: AvailabilitySlotDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        startHour: number;
        endHour: number;
        userId: string;
        dayOfWeek: number;
    }>;
    updateSlot(user: any, slotId: string, dto: UpdateAvailabilitySlotDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        startHour: number;
        endHour: number;
        userId: string;
        dayOfWeek: number;
    }>;
    deleteSlot(user: any, slotId: string): Promise<{
        message: string;
    }>;
}
