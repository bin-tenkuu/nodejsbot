import {CQEvent} from "go-cqwebsocket";
import {CQTag} from "go-cqwebsocket/out/tags";
import {IncomingMessage, Server, ServerResponse} from "http";
import "reflect-metadata";

type Constructor = { new(...args: any[]): any };
type TypedFunction<P extends any[] = any[], R = any> = (...args: P) => R;
type FunctionDecorator<T extends TypedFunction = TypedFunction> = <F extends T>(target: Object,
    propertyKey: PropertyKey, descriptor: TypedPropertyDescriptor<F>) => void;
type ConstructorDecorator<T extends Constructor = Constructor> = (constructor: T) => T | void;
type PropertyDecorator = (target: Object, propertyKey: PropertyKey) => void;
type ParameterDecorator = (target: Object, propertyKey: PropertyKey, parameterIndex: number) => void;

export enum Design {
  type = "design:type",
  paramtypes = "design:paramtypes",
  returntype = "design:returntype"
}

export function logFuncCall(): FunctionDecorator {
  return function (target, propertyKey, descriptor) {
    if (typeof descriptor.value === "function") {
      let value: Function = descriptor.value;
      // @ts-ignore
      descriptor.value = function (...args: any[]) {
        let metadata = Reflect.getMetadata("custom:log", target) ?? {};
        let array: boolean[] = metadata[propertyKey as any] ?? [];
        array.filter(v => v).forEach((v, i) => {
          console.log(`${Date()} ${target.constructor.name}["${String(propertyKey)}"][param at ${i}] = ${args[i]}`);
        });
        console.log(`${Date()} ${target.constructor.name}["${String(propertyKey)}"] be Called`);
        return value.call(this, ...args);
      };
    }
    if (typeof descriptor.get === "function") {
      let get = descriptor.get;
      descriptor.get = function () {
        console.log(`${Date()} ${target.constructor.name}["get ${String(propertyKey)}"] be Called`);
        return get.call(this);
      };
    }
    if (typeof descriptor.set === "function") {
      let set = descriptor.set;
      descriptor.set = function (value) {
        console.log(`${Date()} ${target.constructor.name}["set ${String(propertyKey)}"] be Called`);
        set.call(this, value);
      };
    }
  };
}

export function logCreate(name?: string): ConstructorDecorator {
  return (constructor) => {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        console.log(`${Date()} ${name ?? this.constructor.name} newed an instance`);
      }
    };
  };
}

export function logProp(): PropertyDecorator {
  return function (target, propertyKey) {
    let s = "_" + String(propertyKey);
    Object.defineProperty(target, propertyKey, {
      get() {
        console.log(`${Date()} get ${String(propertyKey)}`);
        return this[s];
      },
      set(v) {
        console.log(`${Date()} set ${String(propertyKey)} => ${v}`);
        this[s] = v;
      },
      configurable: true,
      enumerable: true,
    });
  };
}

export function logParam(): ParameterDecorator {
  return function (target, propertyKey, parameterIndex) {
    let metadata: { [k in PropertyKey]?: boolean[] } = Reflect.getMetadata("custom:log", target) ?? {};
    let array = metadata[propertyKey as any] ?? [];
    array[parameterIndex] = true;
    metadata[propertyKey as any] = array;
    Reflect.defineMetadata("custom:log", metadata, target);
  };
}

export function RequestMapping(url: string): FunctionDecorator<TypedFunction<[IncomingMessage, ServerResponse, URL], void>> {
  return (target, propertyKey) => {
    let metadata = Reflect.getMetadata("http", target) ?? {};
    metadata[url] = propertyKey;
    Reflect.defineMetadata("http", metadata, target);
  };
}

export function CreatServer(port: number, host = "0.0.0.0"): ConstructorDecorator {
  return (constructor) => {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        new Server((req, res) => {
          res.setHeader("Content-type", "text/html; charset=utf-8");
          let url = req.url ?? "";
          let {remoteAddress, remotePort} = req.socket;
          let parse = new URL(url, `http://${remoteAddress}:${remotePort}`);
          let metadata = Reflect.getMetadata("http", this.constructor.prototype) ?? {};
          let key: string | undefined = metadata[parse.pathname] ?? metadata["404"];
          if (key === undefined) {
            key = metadata["404"];
          }
          console.log(`${parse.pathname} 命中解析：${key}`);
          if (key === undefined) {
            res.end();
            return;
          }
          this[key]?.(req, res, parse);
        }).listen(port, host);
      }
    };
  };
}

export function CanAutoCall(): FunctionDecorator<TypedFunction<[CQEvent<"message.group"> | CQEvent<"message.private">], Promise<CQTag<any>[]>>> {
  return (target, propertyKey, descriptor) => {
    if (descriptor.value === undefined) {
      throw new Error("CanAutoCall() can Only Decorator Function");
    }
    Reflect.defineMetadata(CanAutoCall.name, true, descriptor.value);
  };
}