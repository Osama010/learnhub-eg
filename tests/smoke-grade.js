const fs = require("fs");
global.window = { addEventListener(){}, scrollTo(){} };
global.document = { getElementById: (id) => id === "app" ? global.app : ({ onclick: null, disabled: false, className: "", textContent: "" }), querySelectorAll: () => [], addEventListener(){}, createElement: () => ({ style:{}, classList:{add(){}}, querySelector: () => null }), body: { appendChild(){} } };
global.location = { hash: "" };
global.firebase = {};
global.app = { innerHTML: "" };
global.alert = () => {}; global.confirm = () => true;
const src = ["auth.js", "admin.js", "teacher.js", "student.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n;\n")
  + "\n;" + fs.readFileSync("app.js", "utf8") + "\n"
  + fs.readFileSync("/tmp/smoke-tests.js", "utf8");
eval.call(global, src);
