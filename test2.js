fun = (a) => {
  console.group(a.type);
  
  let t;
  console.time("JSON");
  t = JSON.stringify(a);
  console.timeEnd("JSON");
  console.log(t);
  
  console.time("str");
  t = `{"type":"${a.type}","data":${JSON.stringify(a.data)}`;
  console.timeEnd("str");
  console.log(t);
  
  console.groupEnd();
};

for (let i = 0; i < 10; i++) {
  fun({
    type: "image",
    data: {
      "file": "url",
    },
  });
  fun({
    type: "node",
    data: {
      "nodeid": 2938137849,
    },
  });
  fun({
    type: "node",
    data: {
      "name": "2938137849",
      "uid": "2938137849",
      "content": "2938137849",
    },
  });
  fun({
    type: "node",
    data: {
      "name": "2938137849",
      "uid": "2938137849",
      "content": [{
        type: "image",
        data: {
          file: "url",
        },
      },
      ],
    },
  });
}
