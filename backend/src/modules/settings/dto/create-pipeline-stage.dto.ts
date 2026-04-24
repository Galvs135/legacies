import { IsInt, IsString, Min } from "class-validator";

export class CreatePipelineStageDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  order!: number;
}
