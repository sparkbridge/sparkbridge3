const path = require("path");
const f = require("../../handles/file")
spark.web.registerPage("依赖集管理", "index.html")
let json_path = path.join(__dirname, "../../", "manifest.json");

let js_deps = JSON.parse(f.read(json_path)).optionalDependencies || [];
let deps = []
// 
// "optionalDependencies": [
//     {
//         "name": "GMLIB"
//     },
//     {
//         "name": "GMLIB-LegacyRemoteCallApi"
//     }
// ]
function loadDeps() {

    js_deps.forEach(dep => {
        deps.push(dep.name)
    });
}
spark.web.registerApi("GET", "/deps/list", (req, res) => {
    res.json({ code: 200, deps:deps})
});

spark.web.registerApi("POST", "/deps/list", (req, res) => {
    const data = req.body;
    // console.log(data);
    // { deps: [ 'GMLIB', 'GMLIB-LegacyRemoteCallApi' ] }
    desp = data.deps;
    let tmp_manifest = JSON.parse(f.read(json_path));
    tmp_manifest.optionalDependencies = desp.map(dep => {
        return { name: dep }
    })
    f.writeTo(json_path,JSON.stringify(tmp_manifest,null,2))
    res.json({ code: 200, message: "安装成功" });
});

loadDeps();
console.log(deps);