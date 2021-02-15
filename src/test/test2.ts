// import autobind from "autobind-decorator";

class A {
  name = "aaa";
  
  // @autobind
  get(this: this) {
    console.log(this);
  }
}

let b = {
  name: "",
  get: new A().get,
};

b.get();