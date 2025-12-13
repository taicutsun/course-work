import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import knex, { Knex } from 'knex';
import { DatabaseEntity } from '../../common/types/database.types';

interface DatabaseResult {
  rows: any[];
  rowCount: number;
  [key: string]: any;
}

function asDatabaseResult(result: unknown): DatabaseResult {
  return result as DatabaseResult;
}

interface OrderBy {
  column: string;
  direction: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db: Knex;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.db = knex({
      client: 'pg',
      connection: {
        host: this.configService.get<string>('DB_HOST') || 'localhost',
        port: this.configService.get<number>('DB_PORT') || 5432,
        user: this.configService.get<string>('DB_USERNAME') || 'postgres',
        password: this.configService.get<string>('DB_PASSWORD') || 'postgres',
        database: this.configService.get<string>('DB_DATABASE') || 'postgres',
      },
      pool: {
        min: 2,
        max: 10,
      },
    });

    // Test connection
    try {
      await this.db.raw('SELECT 1');
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  getKnex(): Knex {
    return this.db;
  }

  // Helper methods for common operations
  async query(
    sql: string,
    bindings: any[] | Record<string, any> = [],
  ): Promise<DatabaseResult> {
    const result = asDatabaseResult(await this.db.raw(sql, bindings));
    return result;
  }

  async insert<T extends DatabaseEntity>(
    table: string,
    data: Partial<T>,
  ): Promise<T> {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data)
      .map(() => '?')
      .join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = asDatabaseResult(await this.db.raw(sql, values));
    const rows = result.rows;
    return rows[0] as T;
  }

  async update<T extends DatabaseEntity>(
    table: string,
    where: Partial<T>,
    data: Partial<T>,
  ): Promise<T> {
    const setClause = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');
    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');
    const dataValues = Object.values(data) as unknown[];
    const whereValues = Object.values(where) as unknown[];
    const values = [...dataValues, ...whereValues];

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    const result = asDatabaseResult(await this.db.raw(sql, values));
    const rows = result.rows;
    return rows[0] as T;
  }

  async delete<T extends DatabaseEntity>(
    table: string,
    where: Partial<T>,
  ): Promise<number> {
    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');
    const values = Object.values(where);

    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = asDatabaseResult(await this.db.raw(sql, values));
    return result.rowCount || 0;
  }

  async findOne<T extends DatabaseEntity>(
    table: string,
    where: Partial<T>,
  ): Promise<T | null> {
    // For simple lookups, use string interpolation to avoid parameter binding issue
    const whereClause = Object.keys(where)
      .map((key) => `${key} = '${String(where[key as keyof T])}'`)
      .join(' AND ');
    const sql = `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`;

    const result = asDatabaseResult(await this.db.raw(sql));
    const rows = result.rows;
    return rows.length > 0 ? (rows[0] as T) : null;
  }

  async findMany<T extends DatabaseEntity>(
    table: string,
    where?: Partial<T>,
    orderBy?: OrderBy,
  ): Promise<T[]> {
    let sql = `SELECT * FROM ${table}`;
    const values: any[] = [];

    if (where) {
      const whereClause = Object.keys(where)
        .map((key) => `${key} = ?`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      values.push(...(Object.values(where) as unknown[]));
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy.column} ${orderBy.direction}`;
    }

    const result = asDatabaseResult(await this.db.raw(sql, values));
    const rows = result.rows;
    return rows as T[];
  }

  async findById<T extends DatabaseEntity>(
    table: string,
    id: string,
  ): Promise<T | null> {
    const sql = `SELECT * FROM ${table} WHERE id = ? LIMIT 1`;
    const result = asDatabaseResult(await this.db.raw(sql, [id]));
    const rows = result.rows;
    return rows.length > 0 ? (rows[0] as T) : null;
  }
}
