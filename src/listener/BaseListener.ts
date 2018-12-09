import { ChildService } from 'src/ChildService';
import { User } from 'src/entity/auth/User';
import { Context } from 'src/entity/Context';
import { Message } from 'src/entity/Message';
import { FetchOptions, Listener } from 'src/listener/Listener';

import { Session } from './SessionListener';

export abstract class BaseListener<TData> extends ChildService<TData> implements Listener {
  /**
   * Check if this listener can receive messages from this context.
   *
   * Defaults to checking that the context came from this very same listener, by id.
   */
  public async check(context: Context): Promise<boolean> {
    return context.source.id === this.id;
  }

  public abstract send(msg: Message): Promise<void>;

  public abstract fetch(options: FetchOptions): Promise<Array<Message>>;

  public abstract start(): Promise<void>;

  public abstract stop(): Promise<void>;

  public abstract createSession(uid: string, user: User): Promise<Session>;
  public abstract getSession(uid: string): Promise<Session | undefined>;
}
