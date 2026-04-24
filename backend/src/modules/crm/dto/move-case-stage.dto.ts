import { IsString } from "class-validator";
import { PipelineStage } from "../../../shared/types";

export class MoveCaseStageDto {
  @IsString()
  stage!: PipelineStage;
}
