import {logCreate, logFuncCall, logParam, logProp} from "./Annotation";

@logCreate()
class Test {
  @logProp()
  hello: string;
  
  constructor(str: string) {
    this.hello = str;
  }
  
  @logFuncCall()
  method() {
    console.log("this.hello = %s", this.hello);
  }
  
  @logFuncCall()
  get get() {
    return this.hello;
  }
  
  @logFuncCall()
  set(hello: string, @logParam() log: string) {
    this.hello = hello;
  }
}

let t = new Test("ttt");
t.method();
t.set("set", "打印");
console.log("t.get = %s", t.get);
console.dir(t);
