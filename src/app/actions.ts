export type ActionStream = {
  send(action: Action): void;
  subscribe(subscriber: (action: Action) => void): () => void;
};

export function createActionStream(): ActionStream {
  const subscribers: Array<(action: Action) => void> = [];

  return {
    send: (action: Action) => {
      subscribers.forEach((subscriber) => subscriber(action));
    },
    subscribe: (subscriber: (action: Action) => void) => {
      subscribers.push(subscriber);
      return () => {
        const index = subscribers.findIndex((item) => item !== subscriber);
        if (index) subscribers.splice(index, 1);
      };
    },
  };
}

const actionId = new Set<string>();

function checkActionId(id: string): void | never {
  if (actionId.has(id)) {
    throw new Error(`Action with id '${id}' already exist`);
  }
}

export class Action<Id extends string = string, Payload = unknown> {
  readonly id: Id;
  readonly payload: Payload;
  readonly #symbol?: Symbol;

  constructor(id: Id, payload: Payload, symbol?: Symbol) {
    this.id = id;
    this.payload = payload;
    this.#symbol = symbol;
  }

  isSameSymbol(symbol: Symbol) {
    return this.#symbol === symbol;
  }
}

export function createObservableAction<Payload, Id extends string = string>(
  id: Id,
  actionStream?: ActionStream
) {
  checkActionId(id);
  actionId.add(id);

  type Subscriber = (payload: Payload) => void;
  const symbol = Symbol(id);
  const handlers: Array<Subscriber> = [];
  const subscribers: Array<Subscriber> = [];

  return {
    create(payload: Payload): Action<Id, Payload> {
      handlers.forEach((handler) => handler(payload));
      subscribers.forEach((subscriber) => subscriber(payload));
      const action = new Action(id, payload, symbol);
      actionStream?.send(action);
      return action;
    },
    subscribe(subscriber: Subscriber) {
      subscribers.push(subscriber);
      return () => {
        const index = subscribers.findIndex((item) => item !== subscriber);
        if (index) subscribers.splice(index, 1);
      };
    },
    handle(handler: Subscriber) {
      handlers.push(handler);
    },
    isAction(action: Action): action is Action<Id, Payload> {
      return action && action.id === id && action?.isSameSymbol(symbol);
    },
  };
}
