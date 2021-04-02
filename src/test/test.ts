{
  function c(strs: TemplateStringsArray, ...params: any[]) {
    let flatMap = strs.flatMap((value, index) => [value, params[index]])
        .filter(value => value !== null && value !== undefined && value !== "");
    console.log(flatMap);
  }
  
  console.log(c`aaa${1}bb${2}${3}cc${4}`);
}
