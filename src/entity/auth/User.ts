import { GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql';
import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { GRAPH_OUTPUT_ROLE, Role } from 'src/entity/auth/Role';
import { BaseEntity, BaseEntityOptions } from 'src/entity/base/BaseEntity';
import { doesExist } from 'src/utils';

export interface UserOptions extends BaseEntityOptions {
  name: string;
  roles: Array<Role>;
}

export const TABLE_USER = 'user';

@Entity(TABLE_USER)
export class User extends BaseEntity implements UserOptions {
  @PrimaryGeneratedColumn('uuid')
  public id?: string;

  @Column({
    unique: true,
  })
  public name: string = '';

  @Column({
    name: 'roles',
    type: 'simple-json',
  })
  public roleNames: Array<string> = [];

  public roles: Array<Role> = [];

  constructor(options: UserOptions) {
    super(options);

    if (doesExist(options)) {
      this.name = options.name;
      this.roles = options.roles;
    }
  }

  public toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      roles: this.roleNames,
    };
  }

  @BeforeInsert()
  @BeforeUpdate()
  protected syncRoles() {
    this.roleNames = this.roles.map((it) => it.name);
  }
}

export const GRAPH_OUTPUT_USER = new GraphQLObjectType({
  fields: {
    id: {
      type: GraphQLString,
    },
    name: {
      type: GraphQLString,
    },
    roles: {
      type: new GraphQLList(GRAPH_OUTPUT_ROLE),
    },
  },
  name: 'User',
});
