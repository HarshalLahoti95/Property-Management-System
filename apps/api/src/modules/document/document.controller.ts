import { Controller, Get, Post, Param, Query, Body, UseGuards, UseInterceptors, UploadedFile, Delete, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import { CreateDocumentAttachmentDto } from './dto/create-document-attachment.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, DocumentCategory } from '@prisma/client';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @ApiOperation({ summary: 'Upload a new document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: { enum: Object.values(DocumentCategory), example: DocumentCategory.OTHER },
      },
      required: ['file', 'category'],
    },
  })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @UseInterceptors(FileInterceptor('file'))
  @Post()
  async upload(
    @UploadedFile() file: any,
    @Body('category') category: DocumentCategory,
    @CurrentUser() user: any,
  ) {
    return this.documentService.upload(file, category, user);
  }

  @ApiOperation({ summary: 'List and filter uploaded documents' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get()
  async findAll(@Query() query: DocumentQueryDto, @CurrentUser() user: any) {
    return this.documentService.findAll(query, user);
  }

  @ApiOperation({ summary: 'Retrieve document details' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentService.findOne(id, user);
  }

  @ApiOperation({ summary: 'Generate secure pre-signed download URL for a document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get(':id/download')
  async download(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentService.download(id, user);
  }

  @ApiOperation({ summary: 'Stream document file directly' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get(':id/stream')
  async stream(@Param('id') id: string, @CurrentUser() user: any, @Res() res: any) {
    try {
      const streamInfo = await this.documentService.stream(id, user);
      
      res.set({
        'Content-Type': streamInfo.mimeType,
        'Content-Disposition': `inline; filename="${streamInfo.fileName}"`,
      });
      res.send(streamInfo.buffer);
    } catch (err: any) {
      const status = err.getStatus ? err.getStatus() : 500;
      res.status(status).json({
        statusCode: status,
        message: err.message || 'Failed to stream document',
      });
    }
  }

  @ApiOperation({ summary: 'Upload a new version of an existing document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiParam({ name: 'id', description: 'Parent Document UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @UseInterceptors(FileInterceptor('file'))
  @Post(':id/version')
  async uploadVersion(
    @Param('id') parentId: string,
    @UploadedFile() file: any,
    @CurrentUser() user: any,
  ) {
    return this.documentService.uploadVersion(parentId, file, user);
  }

  @ApiOperation({ summary: 'Attach a document to a target business entity' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Post(':id/attach')
  async attach(
    @Param('id') id: string,
    @Body() dto: CreateDocumentAttachmentDto,
    @CurrentUser() user: any,
  ) {
    return this.documentService.attach(id, dto, user);
  }

  @ApiOperation({ summary: 'Detach a document from a target business entity' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Delete(':id/attach')
  async detach(
    @Param('id') id: string,
    @Body() dto: CreateDocumentAttachmentDto,
    @CurrentUser() user: any,
  ) {
    return this.documentService.detach(id, dto, user);
  }

  @ApiOperation({ summary: 'Retrieve chronological version lineage for a document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get(':id/history')
  async findHistory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentService.findHistory(id, user);
  }

  @ApiOperation({ summary: 'Soft-delete a document file' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentService.remove(id, user);
  }
}
