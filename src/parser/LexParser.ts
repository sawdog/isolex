import * as AWS from 'aws-sdk';
import { isNil, isString, kebabCase } from 'lodash';
import { MissingValueError } from 'noicejs';

import { BotServiceOptions } from 'src/BotService';
import { createCompletion } from 'src/controller/helpers';
import { Command, CommandData, CommandDataValue, CommandOptions, CommandVerb } from 'src/entity/Command';
import { Context } from 'src/entity/Context';
import { Fragment } from 'src/entity/Fragment';
import { Message } from 'src/entity/Message';
import { InvalidArgumentError } from 'src/error/InvalidArgumentError';
import { Parser, ParserData } from 'src/parser';
import { BaseParser } from 'src/parser/BaseParser';
import { doesExist, leftPad, mustExist } from 'src/utils';
import { dictToMap } from 'src/utils/Map';
import { TYPE_TEXT } from 'src/utils/Mime';
import { TemplateScope } from 'src/utils/Template';

export interface LexParserData extends ParserData {
  account: {
    accessKey: string;
    secretKey: string;
  };
  bot: {
    alias: string;
    name: string;
    region: string;
  };
}

export class LexParser extends BaseParser<LexParserData> implements Parser {
  protected alias: string;
  protected credentials: AWS.Credentials;
  protected lex: AWS.LexRuntime;

  constructor(options: BotServiceOptions<LexParserData>) {
    super(options, 'isolex#/definitions/service-parser-lex');

    this.alias = options.data.bot.alias;

    // aws
    this.credentials = new AWS.Credentials(options.data.account.accessKey, options.data.account.secretKey);
    this.lex = new AWS.LexRuntime({
      credentials: this.credentials,
      region: options.data.bot.region,
    });
  }

  /**
   * Lex uses stateful (session-based) completion and keeps track of the next slot to be filled. Values must be sent
   * to Lex to be decoded, in order to update state and otherwise behave correctly. This should probably synthesize a
   * message that will use the same Lex session-state and re-parse that.
   */
  public async complete(context: Context, fragment: Fragment, value: CommandDataValue): Promise<Array<Command>> {
    return this.decodeBody(context, value.join(' '));
  }

  public async parse(msg: Message): Promise<Array<Command>> {
    const ctx = mustExist(msg.context);
    return this.decodeBody(ctx, msg.body);
  }

  public async decode(msg: Message): Promise<TemplateScope> {
    if (msg.type !== TYPE_TEXT) {
      throw new InvalidArgumentError(`lex parser can only decode ${TYPE_TEXT} messages`);
    }
    const ctx = mustExist(msg.context);
    return this.decodeBody(ctx, msg.body);
  }

  public async decodeBody(context: Context, body: string): Promise<Array<Command>> {
    const post = await this.postText({
      botAlias: this.data.bot.alias,
      botName: this.data.bot.name,
      inputText: body,
      userId: leftPad(context.getUserId()),
    });

    const response = this.validateResponse(post);

    switch (post.dialogState) {
      case 'ConfirmIntent':
        return [createCompletion({
          ...response,
          context,
        }, 'confirm', 'please confirm', this)];
      case 'ElicitSlot':
        return [createCompletion({
          ...response,
          context,
        }, mustExist(post.slotToElicit), 'missing field', this)];
      case 'ReadyForFulfillment':
        return this.createReply(context, response.noun, response.verb, dictToMap(response.data));
      default:
        this.logger.warn({ post }, 'unsupported dialog state');
        return [];
    }
  }

  protected async createReply(context: Context, noun: string, verb: CommandVerb, data: CommandData): Promise<Array<Command>> {
    const replyContext = await this.createContext(context);
    const cmdOptions: CommandOptions = {
      context: replyContext,
      data,
      labels: this.data.defaultCommand.labels,
      noun,
      verb,
    };

    this.logger.debug({ cmdOptions }, 'command options');
    return [new Command(cmdOptions)];
  }

  protected getSlots(input: AWS.LexRuntime.StringMap | undefined): Map<string, Array<string>> {
    const slots = new Map();
    if (doesExist(input)) {
      for (const [k, v] of Object.entries(input)) {
        slots.set(k, [v]);
      }
    }
    return slots;
  }

  protected postText(params: AWS.LexRuntime.PostTextRequest): Promise<AWS.LexRuntime.PostTextResponse> {
    return new Promise((res, rej) => {
      this.lex.postText(params, (err, reply) => {
        if (isNil(err)) {
          res(reply);
        } else {
          rej(err);
        }
      });
    });
  }

  protected validateResponse(post: AWS.LexRuntime.PostTextResponse): CommandOptions {
    if (!isString(post.dialogState) || post.dialogState === '') {
      const msg = 'lex parsed message without state';
      this.logger.warn({ post }, msg);
      throw new MissingValueError(msg);
    }

    if (!isString(post.intentName) || post.intentName === '') {
      const msg = 'lex parsed message without intent';
      this.logger.warn({ post }, msg);
      throw new MissingValueError(msg);
    }

    if (post.dialogState === 'ElicitSlot' && !isString(post.slotToElicit)) {
      const msg = 'lex parsed message without slot to elicit';
      this.logger.warn({ post }, msg);
      throw new MissingValueError(msg);
    }

    const [intent, intentVerb] = post.intentName.split('_');
    const noun = kebabCase(intent);
    const verb = intentVerb as CommandVerb;
    const data = this.getSlots(post.slots);

    return {
      data,
      labels: this.labels,
      noun,
      verb,
    };
  }
}
