import { Command } from 'src/entity/Command';
import { Message } from 'src/entity/Message';
import { BaseController } from 'src/controller/BaseController';
import { Controller, ControllerConfig, ControllerOptions } from 'src/controller/Controller';
import { Checklist, ChecklistOptions } from 'src/utils/Checklist';
import { Picklist } from 'src/utils/Picklist';

export interface PickControllerConfig extends ControllerConfig {
  check: ChecklistOptions<string>;
  count: string;
  field: {
    count: string;
    data: string;
  };
}

export type PickControllerOptions = ControllerOptions<PickControllerConfig>;

export class PickController extends BaseController<PickControllerConfig> implements Controller {
  protected list: Checklist<string>;

  constructor(options: PickControllerOptions) {
    super(options);

    this.list = new Checklist(options.data.check);
  }

  public async handle(cmd: Command): Promise<void> {
    const count = Number(cmd.getHeadOrDefault(this.data.field.count, this.data.count));
    const data = cmd.get(this.data.field.data).filter((it) => this.list.check(it));
    const list = Picklist.create(...data);
    const puck = list.pick(count);

    this.logger.debug({ count, data, list, puck }, 'picking item');
    return this.bot.send(Message.reply(puck.join(','), cmd.context));
  }
}