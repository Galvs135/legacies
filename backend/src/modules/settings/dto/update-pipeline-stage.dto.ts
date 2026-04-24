import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdatePipelineStageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}
