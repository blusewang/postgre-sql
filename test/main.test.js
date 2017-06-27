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
        connect({user:'postgres',database:'test',max:2,idleTimeoutMillis:100});
        db = new client();
    });

    it('创建SELECT SQL',async ()=>{
        let sql = await db.table('public.users').where({uid:6},'user_name is not null').order('uid desc').group('password').field('user_name').page(3).select(false);
        l(sql);
    });
    it('执行FIND',async()=>{
        let res = await db.table('public.users').where({uid:6}).field('user_name').find();
        l(res);
    });
    it('执行 COUNT',async()=>{
        let res = await db.table('public.users')
        // .where({uid:6})
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
            .save({password:'password'},false);
        l(res);
    });
    it('执行 UPDATE',async()=>{
        let res = await db.table('public.users')
            .where({uid:6})
            .save({password:'lalala',status:{a:'b'},coordinate:'(23,45)'});
        l(res);
    });
    it('创建 INSERT',async()=>{
        let res = await db.table('public.users')
            .add({user_name:'balama',password:'password',status:{mydata:[3,4,5,76,7]}},false);
        l(res);
    });
    it('执行 INSERT',async()=>{
        let res = await db.table('public.users')
            .add({user_name:'balama',password:'password',status:{mydata:[3,4,5,76,7]}});
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
            .where({uid:24})
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
});