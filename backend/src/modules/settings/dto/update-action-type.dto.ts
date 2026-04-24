import { IsOptional, IsString } from "class-validator";

export class UpdateActionTypeDto {
  @IsOptional()
  @IsString()
  name?: string;
}
