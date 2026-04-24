import { IsEmail, IsIn, IsString } from "class-validator";
import { UserRole } from "../../../shared/types";

export class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsIn(["admin", "advogado"])
  role!: UserRole;

  @IsString()
  password!: string;
}
