import { IsNumber, Max, Min } from "class-validator";

export class UpdateCaseProbabilityDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  closeProbability!: number;
}
