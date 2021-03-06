import { MigrationInterface, QueryRunner, Table } from 'typeorm';

import { TABLE_USER } from 'src/entity/auth/User';

export class CreateUser0001544312112 implements MigrationInterface {
  public async up(query: QueryRunner): Promise<void> {
    await query.createTable(new Table({
      columns: [{
        isPrimary: true,
        name: 'id',
        type: 'varchar',
      }, {
        isUnique: true,
        name: 'name',
        type: 'varchar',
      }, {
        name: 'roles',
        type: 'varchar',
      }],
      name: TABLE_USER,
    }));
  }

  public async down(query: QueryRunner): Promise<void> {
    await query.dropTable(TABLE_USER);
  }
}
