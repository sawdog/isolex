import { Container, Module } from 'noicejs';
import * as sourceMapSupport from 'source-map-support';
import * as yargs from 'yargs-parser';

import { Bot, BotOptions } from 'src/Bot';
import { loadConfig } from 'src/config';
import { BotModule } from 'src/module/BotModule';
import { ControllerModule } from 'src/module/ControllerModule';
import { FilterModule } from 'src/module/FilterModule';
import { ListenerModule } from 'src/module/ListenerModule';
import { MigrationModule } from 'src/module/MigrationModule';
import { ParserModule } from 'src/module/ParserModule';
import { BunyanLogger } from 'src/utils/BunyanLogger';
import { signal, SIGNAL_STOP } from 'src/utils/Signal';

import { EntityModule } from './module/EntityModule';
import { TransformModule } from './module/TransformModule';

// main arguments
const MAIN_ARGS = {
  array: ['config-path'],
  count: ['v'],
  envPrefix: 'isolex',
};

// webpack environment defines
declare const BUILD_JOB: string;
declare const BUILD_RUNNER: string;
declare const GIT_BRANCH: string;
declare const GIT_COMMIT: string;
declare const NODE_VERSION: string;
declare const RUNNER_VERSION: string;
declare const WEBPACK_VERSION: string;

const VERSION_INFO = {
  build: {
    job: BUILD_JOB,
    runner: BUILD_RUNNER,
  },
  git: {
    branch: GIT_BRANCH,
    commit: GIT_COMMIT,
  },
  version: {
    node: NODE_VERSION,
    runner: RUNNER_VERSION,
    webpack: WEBPACK_VERSION,
  },
};

sourceMapSupport.install({
  environment: 'node',
  handleUncaughtExceptions: true,
  hookRequire: true,
});

const STATUS_SUCCESS = 0;
const STATUS_ERROR = 1;

async function main(argv: Array<string>): Promise<number> {
  const args = yargs(argv, MAIN_ARGS);
  const config = await loadConfig();
  const logger = BunyanLogger.create(config.data.logger);

  logger.info(VERSION_INFO, 'version info');
  logger.info({ args }, 'main arguments');

  const botModule = new BotModule({ logger });
  const modules: Array<Module> = [
    botModule,
    new ControllerModule(),
    new EntityModule(),
    new FilterModule(),
    new ListenerModule(),
    new ParserModule(),
    new TransformModule(),
  ];

  if (config.data.migrate) {
    modules.push(new MigrationModule());
  }

  const ctr = Container.from(...modules);
  await ctr.configure({ logger });

  const bot = await ctr.create<Bot, BotOptions>(Bot, config);
  botModule.setBot(bot);

  await bot.start();
  await signal(SIGNAL_STOP);
  await bot.stop();

  return STATUS_SUCCESS;
}

main(process.argv).then((status) => process.exit(status)).catch((err) => {
  /* tslint:disable-next-line:no-console */
  console.error('uncaught error during main:', err);
  process.exit(STATUS_ERROR);
});
