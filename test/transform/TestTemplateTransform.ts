import { expect } from 'chai';
import { ineeda } from 'ineeda';
import { ConsoleLogger } from 'noicejs';

import { Bot } from 'src/Bot';
import { Command, CommandVerb } from 'src/entity/Command';
import { Context } from 'src/entity/Context';
import { TemplateTransform, TemplateTransformOptions } from 'src/transform/TemplateTransform';
import { Template } from 'src/utils/Template';
import { TemplateCompiler } from 'src/utils/TemplateCompiler';

import { describeAsync, itAsync } from 'test/helpers/async';
import { createContainer } from 'test/helpers/container';

describeAsync('template transform', async () => {
  itAsync('should transform data', async () => {
    const { container } = await createContainer();

    const templates = {
      body: 'test_body',
    };
    const options: TemplateTransformOptions = {
      bot: ineeda<Bot>(),
      compiler: ineeda<TemplateCompiler>({
        compile: () => ineeda<Template>({
          render: () => templates.body,
        }),
      }),
      container,
      data: {
        parsers: [],
        templates,
      },
      logger: ConsoleLogger.global,
      metadata: {
        kind: 'template-transform',
        name: 'test_transform',
      },
    };
    const transform = await container.create(TemplateTransform, options);
    const output = await transform.transform(Command.create({
      context: ineeda<Context>(),
      data: {},
      noun: 'test',
      verb: CommandVerb.Get,
    }), { test: 1 });

    expect(output.length).to.equal(1);
    expect(output[0].body).to.deep.equal(Array.from(Object.entries(templates)));
  });
});