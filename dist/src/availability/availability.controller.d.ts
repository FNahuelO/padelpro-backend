import { AvailabilityService } from './availability.service';
import { SetAvailabilityDto, AvailabilitySlotDto, UpdateAvailabilitySlotDto } from './dto/set-availability.dto';
export declare class AvailabilityController {
    private availabilityService;
    constructor(availabilityService: AvailabilityService);
    setAvailability(user: any, dto: SetAvailabilityDto): Promise<{
        id: string;
        userId: string;
        dayOfWeek: number;
        startHour: number;
        endHour: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getMyAvailability(user: any): Promise<{
        id: string;
        userId: string;
        dayOfWeek: number;
        startHour: number;
        endHour: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    addSlot(user: any, dto: AvailabilitySlotDto): Promise<{
        id: string;
        userId: string;
        dayOfWeek: number;
        startHour: number;
        endHour: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateSlot(user: any, slotId: string, dto: UpdateAvailabilitySlotDto): Promise<{
        id: string;
        userId: string;
        dayOfWeek: number;
        startHour: number;
        endHour: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteSlot(user: any, slotId: string): Promise<{
        message: string;
    }>;
}
