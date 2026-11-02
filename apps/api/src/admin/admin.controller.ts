import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/types/auth-user';
import { AdminService } from './admin.service';
import { AdminUserQueryDto, UpdateUserDto } from './dto/admin.dto';

@ApiTags('Administration')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Search platform users' })
  users(@Query() query: AdminUserQueryDto) {
    return this.adminService.users(query);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update a user role, name or active state' })
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.adminService.updateUser(id, dto, actor);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Platform counts and recent administrative activity' })
  stats() {
    return this.adminService.stats();
  }
}
