const FTP = require("ftp");
const utils = require("./utils")
const ACCOUNT = require("../config/ftpaccount.json");

ACCOUNT.debug = (log) => console.log(log);


let client = new FTP();



client.on('ready', () => {
  console.log('ftp client is ready');
  // client._send('OPTS UTF8 ON', () => null);
  test();
    client.end();
  utils.delayExit();
});

client.connect(ACCOUNT);

function test() {
  new Promise((resolve, reject) => {
    client.list((err, list) => {
      if (err) reject(err);
      resolve(list)
    })
  }).then(list => {
    list.forEach(file => {
      console.log(file.name);
    })
  }, reason => {
    console.log(reason);
  })
}



