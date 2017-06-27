# node-postgres-builder
A SQLBuilder based on node-postgres


```js
const {client,connect} = require('node-postgres-builder');
connect({user:'postgres',database:'test',max:2,idleTimeoutMillis:100});
let db = new client();
```