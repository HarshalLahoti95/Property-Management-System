import { BaseRepository } from '../repositories/base.repository';

export abstract class BaseService<T> {
  constructor(protected readonly repository: BaseRepository<T>) {}

  async findAll(params?: any): Promise<T[]> {
    return this.repository.findMany(params);
  }

  async findOne(id: string): Promise<T | null> {
    return this.repository.findUnique({ where: { id } });
  }

  async create(data: any): Promise<T> {
    return this.repository.create(data);
  }

  async update(id: string, data: any): Promise<T> {
    return this.repository.update({ where: { id }, data });
  }

  async remove(id: string): Promise<T> {
    return this.repository.delete({ id });
  }
}
