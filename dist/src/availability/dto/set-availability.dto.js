"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAvailabilitySlotDto = exports.SetAvailabilityDto = exports.AvailabilitySlotDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
let IsStartBeforeEndConstraint = class IsStartBeforeEndConstraint {
    validate(_value, args) {
        const obj = args.object;
        return obj.startHour < obj.endHour;
    }
    defaultMessage() {
        return 'La hora de inicio debe ser anterior a la hora de fin';
    }
};
IsStartBeforeEndConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isStartBeforeEnd', async: false })
], IsStartBeforeEndConstraint);
class AvailabilitySlotDto {
}
exports.AvailabilitySlotDto = AvailabilitySlotDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(6),
    __metadata("design:type", Number)
], AvailabilitySlotDto.prototype, "dayOfWeek", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(6),
    (0, class_validator_1.Max)(22),
    __metadata("design:type", Number)
], AvailabilitySlotDto.prototype, "startHour", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(7),
    (0, class_validator_1.Max)(22),
    (0, class_validator_1.Validate)(IsStartBeforeEndConstraint),
    __metadata("design:type", Number)
], AvailabilitySlotDto.prototype, "endHour", void 0);
class SetAvailabilityDto {
}
exports.SetAvailabilityDto = SetAvailabilityDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => AvailabilitySlotDto),
    __metadata("design:type", Array)
], SetAvailabilityDto.prototype, "availabilities", void 0);
class UpdateAvailabilitySlotDto {
}
exports.UpdateAvailabilitySlotDto = UpdateAvailabilitySlotDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(6),
    __metadata("design:type", Number)
], UpdateAvailabilitySlotDto.prototype, "dayOfWeek", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(6),
    (0, class_validator_1.Max)(22),
    __metadata("design:type", Number)
], UpdateAvailabilitySlotDto.prototype, "startHour", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(7),
    (0, class_validator_1.Max)(22),
    __metadata("design:type", Number)
], UpdateAvailabilitySlotDto.prototype, "endHour", void 0);
//# sourceMappingURL=set-availability.dto.js.map