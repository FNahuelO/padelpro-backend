import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto';
export declare class AuthService {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
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
    getMe(userId: string): Promise<{
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
    private generateToken;
}
