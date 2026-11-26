const fs = require("fs");
global.window = { addEventListener(){}, scrollTo(){} };
global.sessionStorage = { getItem: () => null, setItem(){}, removeItem(){} };
global.localStorage = { getItem: () => null, setItem(){}, removeItem(){} };
global.app = { innerHTML: "" };
const mkEl = () => ({ style:{}, className:"", innerHTML:"", remove(){}, querySelector: () => ({ onclick:null }), onclick:null });
global.document = { getElementById: (id) => id === "app" ? global.app : mkEl(), querySelectorAll: () => [], querySelector: () => null, addEventListener(){}, createElement: () => mkEl(), body: { appendChild(){} }, documentElement: { setAttribute(){}, getAttribute: () => null } };
global.location = { hash: "" };
global.firebase = {};
global.alert = (m) => { console.log("ALERT: " + m); };
global.ADMIN_EMAIL = "osamaasas0@gmail.com";
const src = ["auth.js", "admin.js", "teacher.js", "student.js", "app.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n;\n") + `
const main = async () => {
  fbUser = { uid: "adm", email: "osamaasas0@gmail.com" }; fbRole = "admin";
  let writes = [];
  const ref = (c, d) => ({ c, d });
  fbDb = {
    collection: (c) => ({ doc: (d) => ref(c, d) }),
    batch: () => ({ ops: [], update(r, data) { this.ops.push([r, data]); }, async commit() { writes = writes.concat(this.ops); } }),
  };
  adminCache = { students: [{ id: "s1", name: "أحمد", email: "a@x.com", status: "approved" }], teachers: [], subjects: [], admins: [], library: [] };
  adminLoad = async () => {};
  adminStudents = () => {};
  await adminSetSuspended("s1", true);
  const stuW = writes.find(([r]) => r.c === "students" && r.d === "s1");
  const lkW = writes.find(([r]) => r.c === "registrationLookup" && r.d === "a@x.com");
  console.log((stuW && stuW[1].status === "suspended" ? "ok" : "FAIL") + ": admin suspend writes students status");
  console.log((lkW && lkW[1].status === "suspended" ? "ok" : "FAIL") + ": admin suspend writes lookup status");
  writes = [];
  await adminSetSuspended("s1", false);
  const stuW2 = writes.find(([r]) => r.c === "students");
  console.log((stuW2 && stuW2[1].status === "approved" ? "ok" : "FAIL") + ": admin unsuspend restores approved");
  console.log("EXTRA2_DONE");
};
main().catch((e) => { console.error("ERR", e); process.exit(1); });
`;
eval.call(global, src);
