import {autoCallSuper, logCreate, logFuncCall, logProp, override} from "./Annotation";

@logCreate()
class A {
  t = {};
  
  @logFuncCall()
  a() {
    console.log("A");
  }
}

@logCreate()
class B extends A {
  @logProp()
  static t: {};
  
  constructor() {
    super();
    this.a();
  }
  
  @logFuncCall()
  @autoCallSuper()
  @override()
  a() {
    console.log("B");
  }
  
  @logFuncCall()
  static b() {}
}

console.dir(B);
console.dir(new B());
B.b();