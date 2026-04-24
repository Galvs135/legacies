import { IsEmail, IsIn, IsOptional, IsString } from "class-validator";
import { UserRole } from "../../../shared/types";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(["admin", "advogado"])
  role?: UserRole;

  @IsOptional()
  @IsString()
  password?: string;
}
