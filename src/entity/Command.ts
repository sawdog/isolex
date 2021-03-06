import { GraphQLID, GraphQLInputObjectType, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql';
import { isNil } from 'lodash';
import { Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseCommand, BaseCommandOptions } from 'src/entity/base/BaseCommand';
import { Context, GRAPH_OUTPUT_CONTEXT } from 'src/entity/Context';
import { GRAPH_INPUT_NAME_MULTI_VALUE_PAIR, GRAPH_INPUT_NAME_VALUE_PAIR } from 'src/schema/graph/input/Pairs';
import { GRAPH_OUTPUT_NAME_MULTI_VALUE_PAIR, GRAPH_OUTPUT_NAME_VALUE_PAIR } from 'src/schema/graph/output/Pairs';
import { doesExist } from 'src/utils';

export enum CommandVerb {
  Create = 'create',
  Delete = 'delete',
  Get = 'get',
  Help = 'help',
  List = 'list',
  Update = 'update',
}

export interface CommandOptions extends BaseCommandOptions {
  context?: Context;
}

export type CommandData = Map<string, CommandDataValue>;
export type CommandDataValue = Array<string>;
export const TABLE_COMMAND = 'command';

@Entity(TABLE_COMMAND)
export class Command extends BaseCommand implements CommandOptions {
  public static isCommand(it: unknown): it is Command {
    return it instanceof Command;
  }

  @OneToOne((type) => Context, (context) => context.id, {
    cascade: true,
  })
  @JoinColumn()
  public context?: Context;

  @PrimaryGeneratedColumn('uuid')
  public id?: string;

  constructor(options: CommandOptions) {
    super(options);

    if (doesExist(options)) {
      this.context = options.context;
    }
  }

  public toJSON(): object {
    const context = isNil(this.context) ? {} : this.context.toJSON();
    return {
      context,
      data: Array.from(this.data),
      id: this.id,
      noun: this.noun,
      verb: this.verb,
    };
  }
}

export const GRAPH_INPUT_COMMAND = new GraphQLInputObjectType({
  description: 'a command to be executed',
  fields: {
    data: {
      type: new GraphQLList(GRAPH_INPUT_NAME_MULTI_VALUE_PAIR),
    },
    labels: {
      type: new GraphQLList(GRAPH_INPUT_NAME_VALUE_PAIR),
    },
    noun: {
      type: GraphQLString,
    },
    verb: {
      type: GraphQLString,
    },
  },
  name: 'CommandInput',
});

export const GRAPH_OUTPUT_COMMAND = new GraphQLObjectType({
  fields: {
    context: {
      type: GRAPH_OUTPUT_CONTEXT,
    },
    data: {
      type: new GraphQLList(GRAPH_OUTPUT_NAME_MULTI_VALUE_PAIR),
    },
    id: {
      type: GraphQLID,
    },
    labels: {
      type: new GraphQLList(GRAPH_OUTPUT_NAME_VALUE_PAIR),
    },
    noun: {
      type: GraphQLString,
    },
    verb: {
      type: GraphQLString,
    },
  },
  name: 'Command',
});
