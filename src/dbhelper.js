/**
 * Created by bluse on 17/6/27.
 */

const {promisify} = require('./helper');
const queryTableSQL = "SELECT attname, atttypid ::regtype, attnotnull, attnum FROM pg_attribute WHERE attrelid = '__TABLE__' ::regclass AND attnum > 0 AND attisdropped = 'f'";
const queryTablePKSQL = "SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = '__TABLE__'::regclass AND i.indisprimary";

let tablesInfo = [];

class dbhelper{
    constructor(pool){
        this.pool = pool;
        this.sql='';
        this.values = [];
        this.tables=[];
        this.fields=[];
        this.fragment={};
    }
    async getTableFields(table,fn){
        try{
            let fields = await this.pool.query(queryTableSQL.replace('__TABLE__',table));
            fn(null,fields.rows);
        }catch (e){
            fn(e)
        }
    }
    async getTablePK(table,fn){
        try{
            let fields = await this.pool.query(queryTablePKSQL.replace('__TABLE__',table));
            fn(null,fields.rows[0] ? fields.rows[0].attname : null);
        }catch (e){
            fn(e)
        }
    }
    async getTableInfo(table,fn){
        try{
            if(tablesInfo[table]) fn(null,tablesInfo[table]);
            else{
                let info = {};
                info.fieldsInfo = await promisify(this.getTableFields,[table],this);
                info.fields = info.fieldsInfo.map(f=>f.attname);
                info.pk = await promisify(this.getTablePK,[table],this);
                tablesInfo[table] = info;
                fn(null,info);
            }
        }catch (e){
            fn(e);
        }
    }
    /**
     * 准备
    */
    beReady(){
        this.tables = [];
        this.fields = [];
        this.fragment = {};
        this.sql = '';
        this.values = [];
    }
    /**
     * 转换Where语句
    */
    transformWhere(){
        if(!this.fragment.where) return ;
        if(typeof this.fragment.where === 'string') return ;
        let str='';
        Object.keys(this.fragment.where).forEach(field=>{
            if(this.fields.indexOf(field)>-1){
                this.values.push(this.fragment.where[field]);
                str += field+'=$'+this.values.length+' AND ';
            }
        });
        if(typeof this.fragment.where._string === 'string') str += this.fragment.where._string + ' AND ';
        str = str.substr(0,str.length-4);
        this.fragment.where = 'WHERE '+ str+' ';
    }
    /**
     * 准备字段
    */
    async prepareFields(){
        let promises=[];
        this.tables.forEach(t=>promises.push(promisify(this.getTableInfo,[t],this)));
        (await Promise.all(promises)).forEach(info=>{
            this.fields = this.fields.concat(info.fields);
        });
    }
    /**
     * 合成SELECT
    */
    async compileSelectSQL(){
        await this.prepareFields();
        this.transformWhere();
        let s = this.fragment;
        return ['SELECT ' + (s.field === undefined ? '* ' : s.field) + 'FROM ' + s.table +
            (s.join === undefined ? '' : s.join) +
            (s.where === undefined ? '' : s.where) +
            (s.group === undefined ? '' : s.group) +
            (s.order === undefined ? '' : s.order) +
            (s.limit === undefined ? '' : s.limit),this.values];
    }
    /**
     * 合成INSERT
     */
    async compileInsertSQL(data){
        await this.prepareFields();
        let sql = 'INSERT INTO '+this.fragment.table+' (';
        let fields = '';
        let vars = '';
        Object.keys(data).forEach(field=>{
            if(this.fields.indexOf(field)>-1){
                this.values.push(data[field]);
                vars += '$'+this.values.length+',';
                fields += field+',';
            }
        });
        sql += fields.substr(0,fields.length-1) + ') VALUES ('+vars.substr(0,vars.length-1)+')';
        return [sql,this.values];
    }
    /**
     * 合成UPDATE
     */
    async compileUpdateSQL(data){
        await this.prepareFields();
        let sql = 'UPDATE '+this.fragment.table+' SET ';
        Object.keys(data).forEach(field=>{
            if(this.fields.indexOf(field)>-1){
                this.values.push(data[field]);
                sql += field+'=$'+this.values.length+', ';
            }
        });
        this.transformWhere();
        sql = sql.substr(0,sql.length-2)+' '+ this.fragment.where;
        return [sql,this.values];
    }
    /**
     * 合成DELETE
     */
    async compileDeleteSQL(){
        await this.prepareFields();
        let sql = 'DELETE FROM '+this.fragment.table;
        this.transformWhere();
        sql += this.fragment.where;
        return [sql.trim(),this.values];
    }
    /**
     * @deprecated
    */
    async getLastInsertID(table,pk,fn){
        try{
            let fields = await this.pool.query("SELECT currval(pg_get_serial_sequence($1,$2))",[table,pk]);
            fn(null,fields.rows);
        }catch (e){
            fn(e);
        }
    }
}
module.exports = dbhelper;