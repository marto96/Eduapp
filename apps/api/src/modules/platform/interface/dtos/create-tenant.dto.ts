import { IsArray, IsHexColor, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @Matches(/^[a-z][a-z0-9-]{1,30}$/, {
    message: 'subdomain debe ser minúsculas, números y guiones, empezando con una letra',
  })
  subdomain: string;

  @IsOptional()
  @IsString()
  customDomain?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledModules?: string[];

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;
}
