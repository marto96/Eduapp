import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { ResetUserPasswordUseCase } from '../../application/use-cases/reset-user-password.use-case';
import { EditUserUseCase } from '../../application/use-cases/edit-user.use-case';
import { DeactivateUserUseCase } from '../../application/use-cases/deactivate-user.use-case';
import { ReactivateUserUseCase } from '../../application/use-cases/reactivate-user.use-case';
import { CreateUserDto } from '../dtos/create-user.dto';
import { EditUserDto } from '../dtos/edit-user.dto';
import { ListUsersQueryDto } from '../dtos/list-users-query.dto';
import { User } from '../../domain/entities/user.entity';

/**
 * Nunca devuelve la entidad `User` de dominio directamente: aunque
 * `passwordHash` esté marcado `private` en TypeScript, en runtime sigue
 * siendo una propiedad enumerable normal y el serializador JSON de Nest la
 * incluiría. Se mapea a un objeto plano explícito (mismo criterio que
 * `AuthController.me`).
 */
function toResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    status: user.status,
    birthDate: user.birthDate,
    documentType: user.documentType,
    documentNumber: user.documentNumber,
    address: user.address,
  };
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly resetUserPassword: ResetUserPasswordUseCase,
    private readonly editUser: EditUserUseCase,
    private readonly deactivateUser: DeactivateUserUseCase,
    private readonly reactivateUser: ReactivateUserUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'User'))
  async create(@Body() dto: CreateUserDto) {
    const user = await this.createUser.execute(dto);
    return toResponse(user);
  }

  @Get()
  @CheckPolicies((ability) => ability.can('read', 'User'))
  async list(@Query() query: ListUsersQueryDto) {
    const result = await this.listUsers.execute(query.role, query.page, query.pageSize, query.search);
    if (Array.isArray(result)) return result.map(toResponse);
    return { ...result, items: result.items.map(toResponse) };
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('manage', 'User'))
  async edit(@Param('id') id: string, @Body() dto: EditUserDto, @CurrentUser() currentUser: JwtPayload) {
    const user = await this.editUser.execute(id, dto, currentUser);
    return toResponse(user);
  }

  @Patch(':id/reset-password')
  @CheckPolicies((ability) => ability.can('manage', 'User'))
  async resetPassword(@Param('id') id: string) {
    return this.resetUserPassword.execute(id);
  }

  @Patch(':id/deactivate')
  @CheckPolicies((ability) => ability.can('manage', 'User'))
  async deactivate(@Param('id') id: string, @CurrentUser() currentUser: JwtPayload) {
    const user = await this.deactivateUser.execute(id, currentUser);
    return toResponse(user);
  }

  @Patch(':id/reactivate')
  @CheckPolicies((ability) => ability.can('manage', 'User'))
  async reactivate(@Param('id') id: string, @CurrentUser() currentUser: JwtPayload) {
    const user = await this.reactivateUser.execute(id, currentUser);
    return toResponse(user);
  }
}
