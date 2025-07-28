class WebConfigTye{
    static EditArray  = 1;
    static switch = 2;
    static Choosing = 3;
    static text = 4;
    static number = 5;
    static buttom = 6;
}


class WebConfigBuilder{
    plname;
    configObj = {};
    constructor(plname){
        this.plname = plname;
    }
    // 可编辑数组
    addEditArray(k,v,desc = "描述"){
       this.#setKV(k,v,WebConfigTye.EditArray,desc);
    }
    // 可选列表
    addChoosing(k,opt,v,desc = "描述"){
        if(this.configObj[k]){
            throw new Error(`plugin ${this.plname} add a already key (${k}) when build web config`);
        }
        this.configObj[k] = {
            type: WebConfigTye.Choosing,
            value: v,
            options: opt,
            desc
        }
    } 
    // 开关
    addSwitch(k,v,desc = "描述"){
        this.#setKV(k,v,WebConfigTye.switch,desc);
    }
    // 文本项
    addText(k,v,desc = "描述"){
        this.#setKV(k,v,WebConfigTye.text,desc);
    }
    // 数字类型
    addNumber(k,v,desc = "描述"){
        this.#setKV(k,v,WebConfigTye.number,desc);
    }
    // 开关
    addButtom(k,v,desc = "描述"){
        this.#setKV(k, v, WebConfigTye.buttom, desc);
    }
    
    #setKV(k,v,t,desc){
        if(this.configObj[k]){
            throw new Error(`plugin ${this.plname} add a already key (${k}) when build web config`);
        }
        this.configObj[k] = {
            type: t,
            value: v,
            desc
        }
    }
}

module.exports = {WebConfigTye,WebConfigBuilder};