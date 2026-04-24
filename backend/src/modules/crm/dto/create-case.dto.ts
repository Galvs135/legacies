import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateCaseDto {
  @IsString()
  leadName!: string;

  @IsString()
  clientName!: string;

  @IsNumber()
  @Min(0)
  actionValue!: number;

  @IsString()
  actionTypeId!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  closeProbability!: number;

  @IsOptional()
  @IsString()
  ownerUserId?: string;
}
