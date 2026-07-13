import { Controller, Get, Post, NotImplementedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async findAll() {
    throw new NotImplementedException('Method not implemented');
  }

  @Post()
  async create() {
    throw new NotImplementedException('Method not implemented');
  }
}
