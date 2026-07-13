import { PrismaService } from '../../database/prisma.service';

export abstract class BaseRepository<T> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {}

  protected get model() {
    return (this.prisma as any)[this.modelName];
  }

  async findMany(params?: any): Promise<T[]> {
    return this.model.findMany(params);
  }

  async findUnique(params: any): Promise<T | null> {
    return this.model.findUnique(params);
  }

  async findFirst(params?: any): Promise<T | null> {
    return this.model.findFirst(params);
  }

  async create(data: any): Promise<T> {
    return this.model.create({ data });
  }

  async update(params: { where: any; data: any }): Promise<T> {
    return this.model.update(params);
  }

  async delete(where: any): Promise<T> {
    return this.model.delete({ where });
  }
}
