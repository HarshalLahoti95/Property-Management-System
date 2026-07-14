import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { BaseRepository } from '../../core/repositories/base.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  Document,
  DocumentCategory,
  LeaseDocument,
  UserDocument,
  WorkOrderDocument,
  UserRole,
  Prisma,
} from '@prisma/client';

@Injectable()
export class DocumentRepository extends BaseRepository<Document> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'document');
  }

  /**
   * Retrieves a document by UUID.
   */
  async findDocumentById(id: string): Promise<Document | null> {
    return this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: {
        leaseDocuments: { include: { lease: { include: { unit: true, leaseTenants: true } } } },
        userDocuments: { include: { user: true } },
        workOrderDocuments: { include: { workOrder: { include: { unit: true, property: { include: { units: true } } } } } },
      },
    });
  }

  /**
   * Lists documents scoped to user roles.
   */
  async findDocuments(params: {
    skip: number;
    take: number;
    category?: DocumentCategory;
    landlordId?: string;
    tenantId?: string;
  }): Promise<Document[]> {
    const where = this.buildDocumentWhereClause(params);

    return this.prisma.document.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Counts documents scoped to user roles.
   */
  async countDocuments(params: {
    category?: DocumentCategory;
    landlordId?: string;
    tenantId?: string;
  }): Promise<number> {
    const where = this.buildDocumentWhereClause(params);
    return this.prisma.document.count({ where });
  }

  /**
   * Recursively walks up and down the chain to build a linear version history.
   */
  async findHistoryChain(documentId: string): Promise<Document[]> {
    const chain: Document[] = [];

    // 1. Move to the root document of the version chain (where previousDocumentId is null)
    let current: Document | null = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!current) return [];

    while (current && current.previousDocumentId) {
      const prev: Document | null = await this.prisma.document.findUnique({
        where: { id: current.previousDocumentId },
      });
      if (!prev) break;
      current = prev;
    }

    // 2. Walk downwards to compile chronological chain
    let node: Document | null = current;
    while (node) {
      if (node.deletedAt === null) {
        chain.push(node);
      }
      node = await this.prisma.document.findUnique({
        where: { previousDocumentId: node.id },
      });
    }

    return chain;
  }

  // ==========================================
  // HELPER AND SCORING PROCEDURES
  // ==========================================

  private buildDocumentWhereClause(params: {
    category?: DocumentCategory;
    landlordId?: string;
    tenantId?: string;
  }): Prisma.DocumentWhereInput {
    const where: Prisma.DocumentWhereInput = { deletedAt: null };

    if (params.category) {
      where.category = params.category;
    }

    if (params.landlordId) {
      where.OR = [
        { leaseDocuments: { some: { lease: { unit: { landlordId: params.landlordId } } } } },
        { workOrderDocuments: { some: { workOrder: { OR: [ { unit: { landlordId: params.landlordId } }, { unitId: null, property: { units: { some: { landlordId: params.landlordId } } } } ] } } } },
      ];
    } else if (params.tenantId) {
      where.OR = [
        { leaseDocuments: { some: { lease: { leaseTenants: { some: { tenantId: params.tenantId, status: 'ACTIVE' } } } } } },
        { userDocuments: { some: { userId: params.tenantId } } },
        { workOrderDocuments: { some: { workOrder: { unit: { leases: { some: { leaseTenants: { some: { tenantId: params.tenantId, status: 'ACTIVE' } } } } } } } } },
      ];
    }

    return where;
  }
}
