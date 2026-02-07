import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string;
            name: string;
            photo: string;
            rating: number;
            location: string;
            sports: string[];
            preferredHand: string;
            courtPosition: string;
            matchType: string;
            preferredPlayTime: string;
        };
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string;
            name: string;
            photo: string;
            rating: number;
            location: string;
            sports: string[];
            preferredHand: string;
            courtPosition: string;
            matchType: string;
            preferredPlayTime: string;
        };
    }>;
    getMe(user: any): Promise<{
        id: string;
        email: string;
        name: string;
        photo: string;
        rating: number;
        location: string;
        weeklyPoints: number;
        monthlyPoints: number;
        seasonPoints: number;
        sports: string[];
        preferredHand: string;
        courtPosition: string;
        matchType: string;
        preferredPlayTime: string;
    }>;
}
