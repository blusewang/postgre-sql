/**
 * Created by bluse on 17/6/27.
 */

const {promisify} = require('./helper');
const queryTableSQL = "SELECT attname, atttypid ::regtype, attnotnull, attnum, atthasdef FROM pg_attribute WHERE attrelid = '__TABLE__' ::regclass AND attnum > 0 AND attisdropped = 'f'";
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
            let f = field.split('.');
            f = f.length>1?f[1]:f[0];
            if(this.fields.indexOf(f)>-1){
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
        this.sql = 'SELECT ' + (s.field === undefined ? '* ' : s.field) + 'FROM ' + s.table +
            (s.join === undefined ? '' : s.join) +
            (s.where === undefined ? '' : s.where) +
            (s.group === undefined ? '' : s.group) +
            (s.order === undefined ? '' : s.order) +
            (s.limit === undefined ? '' : s.limit);
        return [this.sql,this.values];
    }
    /**
     * 合成INSERT
     */
    async compileInsertSQL(data){
        await this.prepareFields();
        this.sql = 'INSERT INTO '+this.fragment.table+' (';
        let fields = [];
        let vars = [];
        if(typeof data.create_at === 'undefined' && this.fields.indexOf('create_at') > -1) data.create_at = 'NOW()';
        Object.keys(data).forEach(field=>{
            if(this.fields.indexOf(field)>-1){
                this.values.push(data[field]);
                vars.push('$'+this.values.length);
                fields.push(field);
            }
        });
        this.sql += fields.join(',') + ') VALUES ('+vars.join(',')+')';
        return [this.sql,this.values];
    }
    /**
     * 合成UPSERT
     */
    async compileUpSertSQL(data,conflict){
        await this.prepareFields();
        this.sql = 'INSERT INTO '+this.fragment.table+' (';
        let fields = [];
        let vars = [];
        let upFields = [];
        if(typeof data.create_at === 'undefined' && this.fields.indexOf('create_at') > -1) data.create_at = 'NOW()';
        Object.keys(data).forEach(field=>{
            if(this.fields.indexOf(field)>-1){
                this.values.push(data[field]);
                vars.push('$'+this.values.length);
                fields.push(field);
                if(conflict.indexOf(field) === -1) upFields.push( field + '=EXCLUDED.' + field )
            }
        });
        this.sql += fields.join(',') + ') VALUES ('+vars.join(',')+') ON CONFLICT (' +
            conflict.join(',') + ') DO UPDATE SET ' + upFields.join(',');
        return [this.sql,this.values];
    }
    /**
     * 合成UPDATE
     */
    async compileUpdateSQL(data){
        await this.prepareFields();
        this.sql = 'UPDATE '+this.fragment.table+' SET ';
        if(typeof data.update_at === 'undefined' && this.fields.indexOf('update_at') > -1) data.update_at = 'NOW()';
        Object.keys(data).forEach(field=>{
            if(this.fields.indexOf(field)>-1){
                this.values.push(data[field]);
                this.sql += field+'=$'+this.values.length+', ';
            }
        });
        this.transformWhere();
        this.sql = this.sql.substr(0,this.sql.length-2)+' '+ this.fragment.where;
        return [this.sql,this.values];
    }
    /**
     * 合成DELETE
     */
    async compileDeleteSQL(){
        await this.prepareFields();
        this.transformWhere();
        if(this.fields.indexOf('delete_at') > -1)
            this.sql = 'UPDATE '+this.fragment.table+' SET delete_at=NOW() '+this.fragment.where;
        else
            this.sql = 'DELETE FROM '+this.fragment.table+this.fragment.where;
        return [this.sql.trim(),this.values];
    }
}
module.exports = dbhelper;