import { Module } from 'noicejs';
import { ModuleOptions } from 'noicejs/Module';

import { CreateContext0001544311178 } from 'src/migration/0001544311178-CreateContext';
import { CreateCommand0001544311565 } from 'src/migration/0001544311565-CreateCommand';
import { CreateMessage0001544311687 } from 'src/migration/0001544311687-CreateMessage';
import { CreateKeyword0001544311784 } from 'src/migration/0001544311784-CreateKeyword';
import { CreateCounter0001544311799 } from 'src/migration/0001544311799-CreateCounter';
import { CreateRole0001544312069 } from 'src/migration/0001544312069-CreateRole';
import { CreateUser0001544312112 } from 'src/migration/0001544312112-CreateUser';
import { CreateToken0001544317462 } from 'src/migration/0001544317462-CreateToken';

export class MigrationModule extends Module {
  public async configure(options: ModuleOptions): Promise<void> {
    await super.configure(options);

    this.bind('migrations').toInstance([
      CreateContext0001544311178,
      CreateCommand0001544311565,
      CreateMessage0001544311687,
      CreateKeyword0001544311784,
      CreateCounter0001544311799,
      CreateRole0001544312069,
      CreateUser0001544312112,
      CreateToken0001544317462,
    ]);
  }
}
