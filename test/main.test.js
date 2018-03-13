/**
 * Created by bluse on 17/6/27.
 */
const {expect} = require("chai");
const {describe,beforeEach,it} = require("mocha");
const {client,connect} = require('../main');
const {promisify,l} = require('../src/helper');

describe('测试Builder',()=>{
    let db;
    beforeEach(()=>{
        connect({user:'jnpklagg',password:'80erFY8gaD7uqje5YvL1-AXEbaZr9nvd',host:'echo.db.elephantsql.com',database:'jnpklagg',max:2,idleTimeoutMillis:100,connect_timeout:4*1000});
        db = new client();
    });

    it('创建SELECT SQL',async ()=>{
        let sql = await db.table('public.shop').where({uid:6},'shop_name is not null').order('uid desc').group('sid').field('real_name').page(3).select(false);
        l(sql);
        sql = await db.table('public.users u').join(['public.shop s on s.sid=u.sid','public.customer c on c.uid=s.uid'])
            .where({'u.role':1}).find(false);
        l(sql);
    });
    it('执行FIND',async()=>{
        let res = await db.table('public.users').where({uid:6}).field('user_name').find();
        l(res);
    });
    it('执行 COUNT',async()=>{
        let res = await db.table('public.users')
            .where({uid:600})
            .count();
        l(res);
        res = await db.table('public.users')
            .count();
        l(res);
    });
    it('执行 getField',async()=>{
        let res = await db.table('public.users')
            .where({uid:6})
            .getField('password');
        l(res);
    });
    it('创建 UPDATE',async()=>{
        let res = await db.table('public.users')
            .where({uid:6})
            .save({password:Math.random().toString(36).substr(2)},false);
        l(res);
    });
    it('执行 UPDATE',async()=>{
        let res = await db.table('public.users')
            .where({uid:6})
            .save({password:Math.random().toString(36).substr(2),status:{a:'b'},coordinate:'(23,45)'});
        l(res);
    });
    it('创建 INSERT',async()=>{
        let res = await db.table('public.users')
            .add({
                user_name:Math.random().toString(36).substr(2),
                password:Math.random().toString(36).substr(2),
                status:{mydata:[3,4,5,76,7]},
                coordinate:'(116,39)'
                },false);
        l(res);
    });
    it('执行 INSERT',async()=>{
        let res = await db.table('public.users')
            .add({
                user_name:Math.random().toString(36).substr(2),
                password:Math.random().toString(36).substr(2),
                status:{mydata:[3,4,5,76,7]},
                coordinate:'(116,39)'
            });
        l(res);
    });
    it('创建 DELETE',async()=>{
        let res = await db.table('public.users')
            .where({uid:25})
            .delete(false);
        l(res);
    });
    it('执行 DELETE',async()=>{
        let res = await db.table('public.users')
            .where({uid:17})
            .delete();
        l(res);
    });
    it('事务',async()=>{
        await db.begin();
        let res = await db.table('public.users')
            .where({uid:22})
            .delete();
        await db.rollback();
        l(res);
    });
    it('执行 JOIN',async()=>{
        let res = await db.table('public.users u')
            .join(['public.shop s on s.sid=u.sid','public.customer c on c.uid=s.uid'])
            .where({'u.uid':21})
            .field('*')
            .select();
        l(res,db.getLastSQL());
    });
    it('执行 JOIN 的表中存在子查询',async()=>{
        let res = await db.table('public.users u')
            .join(['public.shop s on s.sid=u.sid','(select * from public.customer) c on c.uid=s.uid'])
            .where({'u.uid':21})
            .field('c.*')
            .select();
        l(res,db.getLastSQL());
    });
    it('上次执行的语句',async()=>{
        let res = await db.table('public.users u')
            .where({'u.uid':21})
            .select();
        l(res,db.getLastSQL());
    });
    it('执行 UPSERT',async()=>{
        let res = await db.table('public.users')
            .upsert({uid:6,password:'....'},['uid']);
        l(res,db.getLastSQL());
    });
});