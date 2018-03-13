/**
 * Created by bluse on 17/6/27.
 */
const {Pool} = require('pg').native;
const {promisify, l} = require('./src/helper');
const dbhelper = require('./src/dbhelper');

const poolMode = {
    session:'session',
    transaction:'transaction',
    statement:'statement'
};

let myPool = null;
const connect = (config)=>{
    if(myPool === null) myPool = new Pool(config);
};

class client {
    constructor() {
        if(myPool === null) throw new Error('Please start Pool First!');
        this.mode = poolMode.statement;
        this.client = myPool;
        this._q = this.client.query;
        this._helper = new dbhelper(myPool);
    }

    /**
     * 事务控制区
     */
    begin() {
        return new Promise(async (resolve, reject) => {
            try {
                this.client = await myPool.connect();
                this._q = this.client.query;
                this.mode = poolMode.transaction;
                resolve(await this.client.query('BEGIN'));
            } catch (e) {
                reject(e);
            }
        });
    }

    rollback() {
        return new Promise(async (resolve, reject) => {
            try {
                let r = await this.client.query('ROLLBACK');
                this.client.release();
                this.client = myPool;
                this._q = this.client.query;
                this.mode = poolMode.statement;
                resolve(r);
            } catch (e) {
                reject(e);
            }
        });
    }

    commit() {
        return new Promise(async (resolve, reject) => {
            try {
                let r = await this.client.query('COMMIT');
                this.client.release();
                this.client = myPool;
                this._q = this.client.query;
                this.mode = poolMode.statement;
                resolve(r);
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * 会话控制区
     */
    connect(){
        return new Promise(async (resolve, reject) => {
            try {
                this.client = await myPool.connect();
                this._q = this.client.query;
                this.mode = poolMode.session;
                resolve(true);
            } catch (e) {
                reject(e);
            }
        })
    }

    release(){
        return new Promise(async (resolve, reject) => {
            try {
                if(this.mode === poolMode.session){
                    this.client.release();
                    this.client = myPool;
                    this._q = this.client.query;
                    this.mode = poolMode.statement;
                }
                resolve(true);
            } catch (e) {
                reject(e);
            }
        })
    }


    /**
     * 业务区
     */
    select(doIt=true) {
        return new Promise(async (resolve, reject) => {
            try {
                let sql = await this._helper.compileSelectSQL();
                if(doIt === false) {
                    resolve(sql);
                    return ;
                }
                let res = await promisify(this._q, sql,this.client);
                resolve(res.rows);
            } catch (e) {
                reject(e);
            }
        });
    }

    query(sql){
        return new Promise(async (resolve,reject) => {
            try{
                resolve(await promisify(this._q, [sql], this.client));
            }catch (e){
                reject(e);
            }
        });
    }

    save(data, doIt=true) {
        return new Promise(async (resolve, reject) => {
            try {
                let sql = await this._helper.compileUpdateSQL(data);
                if(doIt === false) {
                    resolve(sql);
                    return ;
                }
                let res = await promisify(this._q, sql,this.client);
                resolve(res.rowCount);
            } catch (e) {
                reject(e);
            }
        });
    }

    add(data,doIt=true) {
        return new Promise(async (resolve, reject) => {
            let needClose = this.mode === poolMode.statement;
            try {
                let sql = await this._helper.compileInsertSQL(data);
                if(doIt === false) {
                    resolve(sql);
                    return ;
                }

                if(needClose) await this.connect();

                let res = await promisify(this.client.query, sql,this.client);
                let table = this._helper.tables[0];
                let info = await promisify(this._helper.getTableInfo,[table]);
                let id = res.rowCount;
                if(info.pk !== null){
                    let pkSQL = 'SELECT currval(pg_get_serial_sequence($1,$2))';
                    res = await promisify(this.client.query,[pkSQL,[table,info.pk]],this.client);
                    if(res.rows[0].currval) id = Number(res.rows[0].currval);
                }
                if(needClose) await this.release();
                resolve(id);
            } catch (e) {
                if(needClose) await this.release();
                reject(e);
            }
        });
    }

    upsert(data,conflict,doIt=true){
        return new Promise(async (resolve, reject) => {
            let needClose = this.mode === poolMode.statement;
            try {
                let sql = await this._helper.compileUpSertSQL(data,conflict);
                if(doIt === false) {
                    resolve(sql);
                    return ;
                }

                if(needClose) await this.connect();

                let res = await promisify(this.client.query, sql,this.client);
                let table = this._helper.tables[0];
                let info = await promisify(this._helper.getTableInfo,[table]);
                let id = res.rowCount;
                if(info.pk !== null){
                    let pkSQL = 'SELECT currval(pg_get_serial_sequence($1,$2))';
                    res = await promisify(this.client.query,[pkSQL,[table,info.pk]],this.client);
                    if(res.rows[0].currval) id = Number(res.rows[0].currval);
                }
                if(needClose) await this.release();
                resolve(id);
            } catch (e) {
                if(needClose) await this.release();
                reject(e);
            }
        });
    }

    delete(doIt=true) {
        return new Promise(async (resolve, reject) => {
            try {
                this.limit(1);
                let sql = await this._helper.compileDeleteSQL();
                if(doIt === false) {
                    resolve(sql);
                    return ;
                }
                let res = await promisify(this._q, sql,this.client);
                resolve(res.rowCount);
            } catch (e) {
                reject(e);
            }
        });
    }

    find(doIt=true) {
        return new Promise(async (resolve, reject) => {
            try {
                this.limit(1);
                let sql = await this._helper.compileSelectSQL();
                if(doIt === false) {
                    resolve(sql);
                    return ;
                }
                let res = await promisify(this._q, sql,this.client);
                resolve(res.rows[0]?res.rows[0]:null);
            } catch (e) {
                reject(e);
            }
        });
    }

    count(doIt=true) {
        return new Promise(async (resolve, reject) => {
            try {
                this.field('count(1) count').limit(1);
                let sql = await this._helper.compileSelectSQL();
                if(doIt === false) {
                    resolve(sql);
                    return ;
                }
                let res = await promisify(this._q, sql,this.client);
                resolve(Number(res.rows[0].count));
            } catch (e) {
                reject(e);
            }
        });
    }

    getField(field,doIt=true) {
        return new Promise(async (resolve, reject) => {
            try {
                field = field.split(' ')[0];
                this.field(field).limit(1);
                let sql = await this._helper.compileSelectSQL();
                if(doIt === false) {
                    resolve(sql);
                    return ;
                }
                let res = await promisify(this._q, sql,this.client);
                resolve(res.rows[0]?res.rows[0][field]:null);
            } catch (e) {
                reject(e);
            }
        });
    }


    /**
     * 辅助区
     */
    table(table) {
        this._helper.beReady();
        this._helper.fragment.table = table.trim()+' ';
        this._helper.tables.push(table.split(' ')[0]);
        return this;
    }

    field(field = '*') {
        this._helper.fragment.field = (field ? field : '*') + ' ';
        return this;
    }

    where(where,_string=null) {
        if(_string !== null){
            if(typeof where === 'string') where = where + ' AND '+ _string;
            else where._string = _string;
        }
        this._helper.fragment.where = where;
        return this;
    }

    order(order) {
        this._helper.fragment.order = 'ORDER BY ' + order + ' ';
        return this;
    }

    limit(offset, num = 0) {
        this._helper.fragment.limit = num > 0 ? 'LIMIT ' + num + ' OFFSET ' + offset : 'LIMIT ' + offset;
        return this;
    }

    page(page = 1, pageSize = 10) {
        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? 1 : pageSize;
        this._helper.fragment.limit = page > 1 ? 'LIMIT ' + pageSize + ' OFFSET ' + (pageSize * (page - 1)) : 'LIMIT ' + pageSize;
        return this;
    }

    group(group) {
        this._helper.fragment.group = 'GROUP BY ' + group + ' ';
        return this;
    }

    join(join, t = 'LEFT JOIN') {
        if (typeof join === 'string') {
            this._helper.fragment.join = t + ' ' + join + ' ';
            this._helper.tables.push(join.split(' ')[0]);
        } else {
            this._helper.fragment.join = '';
            join.forEach(j => {
                this._helper.fragment.join += t + ' ' + j + ' ';
                if (!j.startsWith('(')) this._helper.tables.push(j.split(' ')[0]);
            })
        }
        return this;
    }

    getLastSQL(){
        return [this._helper.sql,this._helper.values];
    }
}


module.exports = {client:client,connect:connect};