import { IsString } from "class-validator";

export class CreateActionTypeDto {
  @IsString()
  name!: string;
}
