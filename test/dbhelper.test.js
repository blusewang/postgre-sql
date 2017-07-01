/**
 * Created by bluse on 17/6/27.
 */

const {expect} = require("chai");
const {describe,beforeEach,it} = require("mocha");

const dbhelper = require('../src/dbhelper');
const {promisify,l} = require('../src/helper');
const {Pool} = require('pg').native;
const myPool = new Pool({user:'jnpklagg',password:'80erFY8gaD7uqje5YvL1-AXEbaZr9nvd',host:'echo.db.elephantsql.com',database:'jnpklagg',max:2,idleTimeoutMillis:100,connect_timeout:40*1000});

describe('db helper 为SQL Builder 提供必要的信息',()=>{
    let helper;
    beforeEach(()=>{
        helper = new dbhelper(myPool);
        l('inited');
    });

    it('获取表字段',async ()=>{
        let fields = await promisify(helper.getTableFields,['public.users'],helper);
        l(fields);
        expect(fields).to.be.an('array');
    });

    it('获取表PK',async ()=>{
        let fields = await promisify(helper.getTablePK,['public.users'],helper);
        l(fields);
        expect(fields).to.be.an('string');
    });

    it('获取表信息',async ()=>{
        let startTime = new Date();
        let info = await promisify(helper.getTableInfo,['public.users'],helper);
        l('first get info cost time:',new Date()-startTime,'ms');
        startTime = new Date();
        info = await promisify(helper.getTableInfo,['public.users'],helper);
        l('second get info cost time:',new Date()-startTime,'ms');
        l(info);
        expect(info).to.be.an('object');
        expect(info.fields).to.be.an('array');
        expect(info.pk).to.be.an('string');
    });

    it('SQL是否支持不连续的变量',async()=>{
        let res = await myPool.query('SELECT password from public.users WHERE user_name=$1',['s6spjx66zpg']);
        l(res);
    });


});