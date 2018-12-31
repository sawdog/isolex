import * as express from 'express';
import * as expressGraphQl from 'express-graphql';
import * as http from 'http';
import { isNil } from 'lodash';
import { Container, Inject } from 'noicejs';
import * as passport from 'passport';
import { ExtractJwt, Strategy as JwtStrategy, VerifiedCallback } from 'passport-jwt';
import { Counter, Registry } from 'prom-client';
import { Connection, Repository } from 'typeorm';

import { BotServiceOptions } from 'src/BotService';
import { JwtFields, Token } from 'src/entity/auth/Token';
import { Context, ContextOptions } from 'src/entity/Context';
import { Message } from 'src/entity/Message';
import { Listener, ListenerData } from 'src/listener/Listener';
import { SessionListener } from 'src/listener/SessionListener';
import { ServiceModule } from 'src/module/ServiceModule';
import { GraphSchema, GraphSchemaData } from 'src/schema/graph';
import { ServiceDefinition, ServiceMetadata } from 'src/Service';

export interface ExpressListenerData extends ListenerData {
  defaultTarget: ServiceMetadata;
  expose: {
    graph: boolean;
    graphiql: boolean;
    metrics: boolean;
  };
  graph: ServiceDefinition<GraphSchemaData>;
  listen: {
    address: string;
    port: number;
  };
  token: {
    audience: string;
    issuer: string;
    scheme: string;
    secret: string;
  };
}

export interface ExpressListenerOptions extends BotServiceOptions<ExpressListenerData> {
  graph: GraphSchema;
}

@Inject('bot', 'clock', 'metrics', 'services', 'storage')
export class ExpressListener extends SessionListener<ExpressListenerData> implements Listener {
  protected readonly container: Container;
  protected readonly metrics: Registry;
  protected readonly requestCounter: Counter;
  protected readonly services: ServiceModule;
  protected readonly storage: Connection;
  protected readonly tokenRepository: Repository<Token>;

  protected express: express.Express;
  protected graph?: GraphSchema;
  protected passport?: passport.Authenticator;
  protected server?: http.Server;
  protected target: Listener;

  constructor(options: ExpressListenerOptions) {
    super(options, 'isolex#/definitions/service-listener-express');

    this.container = options.container;
    this.metrics = options.metrics;
    this.services = options.services;
    this.storage = options.storage;

    this.requestCounter = new Counter({
      help: 'all requests through this express listener',
      labelNames: ['serviceId', 'serviceKind', 'serviceName', 'requestClient', 'requestHost', 'requestPath'],
      name: 'express_request',
      registers: [this.metrics],
    });

    this.tokenRepository = this.storage.getRepository(Token);
  }

  public async start() {
    await super.start();

    this.passport = await this.setupPassport();
    this.express = await this.setupExpress();
    this.server = await new Promise<http.Server>((res, rej) => {
      let server: http.Server;
      server = this.express.listen(this.data.listen.port, this.data.listen.address, () => {
        res(server);
      });
    });

    this.target = this.services.getService(this.data.defaultTarget);
  }

  public async stop() {
    if (this.server) {
      this.server.close();
    }

    if (this.graph) {
      await this.graph.stop();
    }
  }

  public async send() {
    this.logger.warn('express listener is not able to send messages');
  }

  public async fetch(): Promise<Array<Message>> {
    this.logger.warn('express listener is not able to fetch messages');
    return [];
  }

  public getMetrics(req: express.Request, res: express.Response) {
    res.set('Content-Type', this.metrics.contentType);
    res.end(this.metrics.metrics());
  }

  public async traceRequest(req: express.Request, res: express.Response, next: Function) {
    const ctx = req.user as Context | undefined;
    this.logger.debug({ ctx, req, res }, 'handling request');
    this.requestCounter.inc({
      requestClient: req.ip,
      requestHost: req.hostname,
      requestPath: req.path,
      serviceId: this.id,
      serviceKind: this.kind,
      serviceName: this.name,
    });
    next();
  }

  protected async createTokenSession(data: JwtFields, done: VerifiedCallback) {
    this.logger.debug({ data }, 'finding token for request payload');
    const token = await this.tokenRepository.findOne({
      id: data.jti,
    }, {
        relations: ['user'],
      });
    if (isNil(token)) {
      this.logger.warn('token not found');
      return done(undefined, false);
    }

    const session = token.session();
    this.sessions.set(token.user.id, session);
    this.logger.debug({ session, token }, 'created session for token');

    const context = await this.createContext({
      channel: {
        id: '',
        thread: '',
      },
      name: token.user.name,
      token,
      uid: token.user.id,
      user: token.user,
    });
    this.logger.debug({ context, token }, 'created context for token');

    // tslint:disable-next-line:no-null-keyword
    done(null, context);
  }

  protected async setupExpress(): Promise<express.Express> {
    let app = express();

    if (this.passport) {
      app = app.use(this.passport.initialize());
      app = app.use(this.passport.authenticate('jwt'));
    }

    if (this.data.expose.metrics) {
      app = app.use((req, res, next) => this.traceRequest(req, res, next));
      app = app.get('/metrics', (req, res) => this.getMetrics(req, res));
    }

    if (this.data.expose.graph) {
      const graph = await this.services.createService<GraphSchema, GraphSchemaData>(this.data.graph);
      this.graph = graph;

      await graph.start();

      app = app.use('/graph', expressGraphQl({
        graphiql: this.data.expose.graphiql,
        schema: graph.schema,
      }));
    }

    return app;
  }

  protected async setupPassport(): Promise<passport.Authenticator> {
    const auth = new passport.Passport();
    auth.use(new JwtStrategy({
      audience: this.data.token.audience,
      issuer: this.data.token.issuer,
      jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme(this.data.token.scheme),
      secretOrKey: this.data.token.secret,
    }, (payload: JwtFields, done: VerifiedCallback) => this.createTokenSession(payload, done)));

    // sessions are saved when created and keyed by uid, so pass that
    auth.serializeUser((user: Context, done) => {
      this.logger.debug({ user }, 'serializing auth user');
      // tslint:disable-next-line:no-null-keyword
      done(null, user.uid);
    });

    // grab existing session
    auth.deserializeUser((user: Context, done) => {
      this.logger.debug({ user }, 'deserializing auth user');
      // tslint:disable-next-line:no-null-keyword
      done(null, this.sessions.get(user.uid));
    });

    return auth;
  }

  protected async createContext(options: ContextOptions): Promise<Context> {
    return new Context({
      ...options,
      source: this,
      target: this.target,
    });
  }
}
