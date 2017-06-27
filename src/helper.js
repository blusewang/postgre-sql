/**
 * Created by bluse on 17/6/27.
 */
module.exports.promisify = (fn,args,ctx)=>{
    return new Promise((resolve, reject)=>{
        args.push((err,data)=>{
            err === null ? resolve(data) : reject(err)
        });
        Reflect.apply(fn,ctx,args);
    });
};

module.exports.l = console.log;