import { BaseService } from 'src/BaseService';
import { Controller, ControllerConfig, ControllerOptions } from 'src/controller/Controller';
import { Command } from 'src/entity/Command';

export abstract class BaseController<TConfig extends ControllerConfig> extends BaseService<TConfig> implements Controller {
  public readonly name: string;

  constructor(options: ControllerOptions<TConfig>) {
    super(options);
  }

  public async start() {
    /* noop */
  }

  public async stop() {
    /* noop */
  }

  public async check(cmd: Command): Promise<boolean> {
    return cmd.noun === this.name;
  }

  public abstract handle(cmd: Command): Promise<void>;
}