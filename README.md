<p align="center"><img src="https://user-images.githubusercontent.com/1764005/27760456-3dffad94-5e7a-11e7-875a-095b8a0dfd57.png"/></p>

# postgre-SQL
A PostgreSQL support for node.js, based on node-postgres and used Pool.


## 安装
`npm i postgre-sql`
## 配置
```js
const {connect} = require('postgre-sql');
connect({user:'postgres',database:'test',max:2,idleTimeoutMillis:100});

```

## 使用DEMO
```js
const {client} = require('postgre-sql');
let db = new client();
(async ()=>{
    try{
        let res = await db.table('public.users')
            .where({vip:true},"create_at>'2017-01-01' and coordinate <-> point(116,39) < 1")
            .field('uid,user_name').order('uid desc').page(2).select();
            // res -> [{uid:34,use_name:'alice'},{uid:35,user_name:'💘'}...]
    }catch (e){
        // something else
    }
    try{
        await db.begin();
        let new_uid = await db.table('public.users').add({user_name:'charles'});
        await db.commit();
    }catch (e){
        db.rollback();
    }
    
})();

```

## 会话模式

默认是`statement`模式，这个模式的语句会平均负载到池中所有的连接。适合并行查询！

会话模式会根据业务自动调整。

### 语句模式 `statement`
```js
const {client} = require('postgre-sql');
let db = new client();
(async ()=>{
    try{
        let res = await db.table('public.users')
            .where({vip:true},"create_at>'2017-01-01' and coordinate <-> point(116,39) < 1")
            .field('uid,user_name').order('uid desc').page(2).select();
            // res -> [{uid:34,use_name:'alice'},{uid:35,user_name:'💘'}...]
    }catch (e){
        // something else
    }
})();
```

### 会话模式 `session`

```js
const {client} = require('postgre-sql');
let db = new client();
(async ()=>{
    try{
        await db.connect();
        let res = await db.table('public.users')
            .where({vip:true},"create_at>'2017-01-01' and coordinate <-> point(116,39) < 1")
            .field('uid,user_name').order('uid desc').page(2).select();
            // res -> [{uid:34,use_name:'alice'},{uid:35,user_name:'💘'}...]
        await db.release(); // Attention! if connection a session don't forget release it!
    }catch (e){
        await db.release(); // Attention! if connection a session don't forget release it!
        // something else
    }
})();
```

### 事务模式 `transaction`

```js
const {client} = require('postgre-sql');
let db = new client();
(async ()=>{
    try{
        await db.begin();
        let new_uid = await db.table('public.users').add({user_name:'charles'});
        await db.commit(); // Attention! if start a transaction don't forget finish it!
    }catch (e){
        db.rollback(); // Attention! if start a transaction don't forget finish it!
    }
    
})();
```

## 自动完成

如果表中有`create_at`、`update_at`、`delete_at`。在CUD的操作中会自动填充`NOW()`。

软删除只在`db.table(tableName).where(conditions).delete();`时影响结果。

在`SELECT`类型的语句中，不会主动识，别并剔除`delete_at`非空的记录。需要手动写在`conditions`中。

