import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { LeadSource } from "./lead-source.enum";

export class CreateLeadDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(LeadSource)
  source!: LeadSource;

  @IsOptional()
  @IsString()
  notes?: string;
}
