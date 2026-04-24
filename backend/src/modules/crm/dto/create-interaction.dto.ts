import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateInteractionDto {
  @IsIn(["email", "meeting", "call", "note", "whatsapp"])
  kind!: "email" | "meeting" | "call" | "note" | "whatsapp";

  @IsString()
  content!: string;

  @IsOptional()
  @IsIn(["positive", "neutral", "negative"])
  sentiment?: "positive" | "neutral" | "negative";
}
