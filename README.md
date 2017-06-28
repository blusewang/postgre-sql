# node-postgres-builder
A SQLBuilder based on node-postgres

## 安装
`npm i node-postgres-builder`
## 配置
```js
const {connect} = require('node-postgres-builder');
connect({user:'postgres',database:'test',max:2,idleTimeoutMillis:100});

```

## 使用
```js
const {client} = require('node-postgres-builder');
let db = new client();
(async ()=>{
    let res = await db.table('public.users')
    .where({vip:true},"create_at>'2017-01-01' and coordinate <-> point(116,39) < 1")
    .field('uid,user_name').order('uid desc').page(2).select();
    // res -> [{uid:34,use_name:'alice'},{uid:35,user_name:'💘'}...]
    try{
        await db.begin();
        let new_uid = await db.table('public.users').add({user_name:'charles'});
        await db.commit();
    }catch (e){
        db.rollback();
    }
    
})();

```