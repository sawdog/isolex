import { isNil } from 'lodash';
import { Inject } from 'noicejs';
import { Connection, Repository } from 'typeorm';

import { Role } from 'src/entity/auth/Role';
import { Session } from 'src/entity/auth/Session';
import { User } from 'src/entity/auth/User';
import { Command, CommandVerb } from 'src/entity/Command';
import { Context, ContextData } from 'src/entity/Context';
import { Message } from 'src/entity/Message';
import { TYPE_JSON, TYPE_TEXT } from 'src/utils/Mime';
import { SessionProvider } from 'src/utils/SessionProvider';

import { BaseController } from './BaseController';
import { Controller, ControllerData, ControllerOptions } from './Controller';

export const NOUN_SESSION = 'session';
export const NOUN_USER = 'user';

export type AuthControllerData = ControllerData;
export interface AuthControllerOptions extends ControllerOptions<AuthControllerData> {
  storage: Connection;
}

@Inject('storage')
export class AuthController extends BaseController<AuthControllerData> implements Controller, SessionProvider {
  protected storage: Connection;
  protected roleRepository: Repository<Role>;
  protected sessionRepository: Repository<Session>;
  protected userRepository: Repository<User>;

  constructor(options: AuthControllerOptions) {
    super({
      ...options,
      nouns: [NOUN_SESSION, NOUN_USER],
    });

    this.storage = options.storage;
    this.roleRepository = this.storage.getRepository(Role);
    this.sessionRepository = this.storage.getRepository(Session);
    this.userRepository = this.storage.getRepository(User);
  }

  public async handle(cmd: Command): Promise<void> {
    switch (cmd.noun) {
      case 'session':
        return this.handleSession(cmd);
      case 'user':
        return this.handleUser(cmd);
      default:
        return this.bot.send(Message.reply(cmd.context, TYPE_TEXT, `unknown entity: ${cmd.noun}`));
    }
  }

  public async handleUser(cmd: Command): Promise<void> {
    switch (cmd.verb) {
      case CommandVerb.Create:
        return this.createUser(cmd);
      case CommandVerb.Get:
        return this.getUser(cmd);
    }
  }

  public async handleSession(cmd: Command): Promise<void> {
    switch (cmd.verb) {
      case CommandVerb.Create:
        return this.createSession(cmd);
      case CommandVerb.Get:
        return this.getSession(cmd);
    }
  }

  public async createUser(cmd: Command): Promise<void> {
    if (cmd.context.session) {
      return this.bot.send(Message.reply(cmd.context, TYPE_TEXT, 'cannot create users while logged in'));
    }

    const name = cmd.getHeadOrDefault('name', cmd.context.userName);
    const roles = cmd.get('roles');
    const user = await this.userRepository.save(User.create({
      name,
      roles,
    }));

    this.logger.debug({ user }, 'created user');
    return this.bot.send(Message.reply(cmd.context, TYPE_TEXT, `created user: ${user.id}`));
  }

  public async createSession(cmd: Command): Promise<void> {
    if (cmd.context.session) {
      return this.bot.send(Message.reply(cmd.context, TYPE_TEXT, 'cannot create sessions while logged in'));
    }

    const sessionKey = AuthController.getSessionKey(cmd.context);
    const existingSession = await this.sessionRepository.findOne(sessionKey);
    if (existingSession) {
      return this.bot.send(Message.reply(cmd.context, TYPE_TEXT, 'session already exists'));
    }

    const userName = cmd.getHeadOrDefault('name', cmd.context.userName);
    const user = await this.userRepository.findOne({
      name: userName,
    });

    if (isNil(user)) {
      this.logger.warn({ sessionKey, userName }, 'user not found for new session');
      return this.bot.send(Message.reply(cmd.context, TYPE_TEXT, 'user not found'));
    }

    this.logger.debug({ user }, 'logging in user');

    const session = await this.sessionRepository.save(Session.create({
      ...AuthController.getSessionKey(cmd.context),
      user,
    }));

    this.logger.debug({ session, user, userName }, 'created session');
    return this.bot.send(Message.reply(cmd.context, TYPE_TEXT, 'created session'));
  }

  public async getUser(cmd: Command): Promise<void> {
    if (!cmd.context.session) {
      return this.bot.send(Message.reply(cmd.context, TYPE_TEXT, 'cannot get users unless logged in'));
    }

    const session = await this.sessionRepository.findOne({
      id: cmd.context.session.id,
    });
    if (isNil(session)) {
      return this.bot.send(Message.reply(cmd.context, TYPE_TEXT, 'session does not exist'));
    }

    return this.bot.send(Message.reply(cmd.context, TYPE_JSON, session.user.toString()));
  }

  public async getSession(cmd: Command): Promise<void> {
    if (!cmd.context.session) {
      return this.bot.send(Message.reply(cmd.context, TYPE_TEXT, 'cannot get sessions unless logged in'));
    }

    const session = await this.sessionRepository.findOne({
      id: cmd.context.session.id,
    });
    if (isNil(session)) {
      return this.bot.send(Message.reply(cmd.context, TYPE_TEXT, 'session does not exist'));
    }

    return this.bot.send(Message.reply(cmd.context, TYPE_JSON, session.toString()));
  }

  /**
   * Check a set of shiro-style permissions
   */
  public async checkPermissions(ctx: Context, perms: Array<string>): Promise<boolean> {
    return false;
  }

  /**
   * Attach session information to the provided context.
   */
  public async createSessionContext(data: ContextData): Promise<Context> {
    this.logger.debug({ data }, 'decorating context with session');

    const sessionKey = AuthController.getSessionKey(data);
    const session = await this.sessionRepository.findOne(sessionKey);

    if (isNil(session)) {
      this.logger.debug({ data }, 'no session for context');
      return Context.create(data);
    }

    const context = Context.create({
      ...data,
      session,
    });
    this.logger.debug({ context, session }, 'found session for context');

    return context;
  }

  protected static getSessionKey(ctx: ContextData) {
    return {
      listenerId: ctx.listenerId,
      userName: ctx.userId,
    };
  }
}
