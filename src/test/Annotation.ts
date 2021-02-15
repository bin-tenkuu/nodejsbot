type Prototype = {
  constructor: Function
  __proto__: Prototype
} & any

type Constructor = { new(...args: any[]): {} };

interface FunctionAnnotation {
  <T>(target: Prototype, propertyKey: PropertyKey, descriptor: TypedPropertyDescriptor<T>): void;
}

interface ConstructorAnnotation {
  <T extends Constructor>(constructor: T): T;
}

interface PropertyAnnotation {
  (target: Prototype, propertyKey: PropertyKey): void;
}

interface ParameterAnnotation {
  (target: Prototype, propertyKey: PropertyKey, parameterIndex: number): void;
}

export function logFuncCall(): FunctionAnnotation {
  return <FunctionAnnotation>function (target, propertyKey, descriptor) {
    if (typeof descriptor.value === "function") {
      let value: Function = descriptor.value;
      // @ts-ignore
      descriptor.value = function (...args: any) {
        // @ts-ignore
        value.logParam?.forEach(i => console.log(`${Date()} 第${i}参数: ${args[i]}`));
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

// 匿名写法
export function logCreate(): ConstructorAnnotation {
  return <T extends Constructor>(constructor: T) => {
    return <T>class {
      constructor(...args: any[]) {
        console.log(`${Date()} ${constructor.name} new an instance`);
        return new constructor(...args);
      }
    };
  };
}//*/

/*// 继承写法
 export function logCreate(): ConstructorAnnotation {
 return <T extends Constructor>(constructor: T) => {
 return class extends constructor {
 constructor(...args: any[]) {
 console.log(`${Date()} ${constructor.name} new an instance`);
 super(...args);
 }
 };
 };
 }//*/

export function logProp(): PropertyAnnotation {
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

export function logParam(): ParameterAnnotation {
  return function (target, propertyKey, parameterIndex) {
    target[propertyKey].logParam = [...target[propertyKey].logParam ?? [], parameterIndex];
  };
}

/** (运行时)当父类中没有对应方法时报错 */
export function override(): FunctionAnnotation {
  return (target, propertyKey) => {
    if (target.__proto__?.[propertyKey] === undefined) {
      console.error(`Method "${String(propertyKey)}" Not A Override Function`);
    }
  };
}

export function autoCallSuper(): FunctionAnnotation {
  return (target, propertyKey, descriptor) => {
    if (typeof descriptor.value === "function") {
      let value = descriptor.value;
      if (typeof target.__proto__?.[propertyKey] === "function") {
        // @ts-ignore
        descriptor.value = function (...args: any) {
          target.__proto__[propertyKey].apply(this, args);
          return value.apply(this, args);
        };
      } else {
        console.error(`${target.__proto__.constructor.name} Have Not A Function Called "${String(propertyKey)}"`);
      }
    } else {
      console.warn(`"callSuper" Annotation Only Used On NormalFunction, Not Getter/Setter`);
    }
  };
}