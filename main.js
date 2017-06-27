/**
 * Created by bluse on 17/6/27.
 */
const {Pool} = require('pg').native;
const myPool = new Pool({user:'bluse',database:'postgres',host:'localhost',max:5,idleTimeoutMillis:100});
const {promisify,l} = require('./helper');

let tableCacheData = {};
const queryTableSQL = "SELECT attname, atttypid ::regtype, attnotnull, attnum FROM pg_attribute WHERE attrelid = '__TABLE__' ::regclass AND attnum > 0 AND attisdropped = 'f'";
const queryTablePKSQL = "SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = '__TABLE__'::regclass AND i.indisprimary";


class db{
    constructor(){
        this.client = myPool;
        this._q = this.client.query;
        this._s = {};
        this._sql = null;
    }

    /**
     * 事务区
     */
    begin(){
        return new Promise(async (resolve,reject)=>{
                try{
                    this.client = await myPool.connect();
        resolve(await this._q('BEGIN'));
    }catch (e){
            reject(e);
        }
    });
    }
    rollback(){
        return new Promise(async (resolve,reject)=>{
                try{
                    let r = await this._q('BEROLLBACKGIN');
        this.client.release();
        this.client = myPool;
        resolve(r);
    }catch (e){
            reject(e);
        }
    });
    }
    commit(){
        return new Promise(async (resolve,reject)=>{
                try{
                    let r = await this._q('COMMIT');
        this.client.release();
        this.client = myPool;
        resolve(r);
    }catch (e){
            reject(e);
        }
    });
    }


    /**
     * 业务区
     */
    select(doit){
        return new Promise(async (resolve,reject)=>{
                try{
                    this._s._table = await promisify(prepareTable(this._q,this._s._table));
        this._sql = await promisify(buildSQL(this.client,this._s));
        return doit === false ? this._sql : promisify(this._q,[this._sql]);
    }catch (e){
            reject(e);
        }
    });
    }
    save(data,doit){
        return new Promise((resolve,reject)=>{
                try{

                }catch (e){
                    reject(e);
                }
            });
    }
    add(){
        return new Promise(async (resolve,reject)=>{
                try{

                }catch (e){
                    reject(e);
                }
            });
    }
    delete(){
        return new Promise(async (resolve,reject)=>{
                try{

                }catch (e){
                    reject(e);
                }
            });
    }
    find(){
        return new Promise(async (resolve,reject)=>{
                try{

                }catch (e){
                    reject(e);
                }
            });
    }
    count(){
        return new Promise(async (resolve,reject)=>{
                try{

                }catch (e){
                    reject(e);
                }
            });
    }
    getField(){
        return new Promise(async (resolve,reject)=>{
                try{

                }catch (e){
                    reject(e);
                }
            });
    }


    /**
     * 辅助区
     */
    table(table){
        this._s = {table:table,_table:{}};
        this._s._table[table.split(' ')[0]] = null;
        return this;
    }
    field(field='*'){
        this._s.field = (field?field:'*')+' ';
        return this;
    }
    where(where){
        this._s.where = where;
        return this;
    }
    order(order){
        this._s.order = 'ORDER BY '+order+' ';
        return this;
    }
    limit(offset,num=0){
        this._s.limit = num > 0 ? 'LIMIT '+num+' OFFSET '+offset : 'LIMIT '+offset;
        return this;
    }
    page(page=1,pageSize=10){
        page = page<1 ? 1 : page;
        pageSize = pageSize<1 ? 1 : pageSize;
        this._s.limit = page>1 ? 'LIMIT '+pageSize+' OFFSET '+(pageSize*(page-1)) : 'LIMIT '+pageSize;
        return this;
    }
    group(group){
        this._s.group = 'GROUP BY '+group+' ';
        return this;
    }
    join(join,t='LEFT JOIN'){
        if(typeof join === 'string'){
            this._s.join = t+' '+join+' ';
            this._s._table[join.split(' ')[0]] = null;
        }else{
            join.forEach(j=>{
                this._s.join += t+' '+j+' ';
            this._s._table[j.split(' ')[0]] = null;
        })
        }
        return this;
    }
}

const prepareTable = async (query,tables,fn)=>{
    let nk = [], np = [];
    Object.keys(tables).forEach(k=>{
        if(tableCacheData[k] !== undefined) tables[k] = tableCacheData[k];
else {
        nk.push(k);
        np.push(query(queryTableSQL.replace('__TABLE__',k)));
    }
});
    try{
        let ns = await Promise.all(np);
        nk.forEach((t,k)=>{
            tableCacheData[t] = ns[k];
        tables[t] = ns[k];
    });
        fn(null,tables);
    }catch (e){fn(e)}
};

const buildSQL = (c,s,fn)=>{





    return new Promise(async (resolve,reject)=>{





            resolve('SELECT ' + (s.field === undefined ? ' * ' : s.field) + 'FROM ' + s.table +
            (s.join === undefined ? '' : s.join) +
            (s.where === undefined ? '' : s.where) +
            (s.group === undefined ? '' : s.group) +
            (s.order === undefined ? '' : s.order) +
            (s.limit === undefined ? '' : s.limit))
});
};

module.exports = db;