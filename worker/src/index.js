const MAX_BODY_BYTES = 2_000_000;
const MAX_SESSIONS = 5000;

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin"
  };
}
function json(env, status, body) {
  return new Response(JSON.stringify(body), { status, headers: {"Content-Type":"application/json; charset=utf-8", ...corsHeaders(env)} });
}
function authorized(request, token) { return Boolean(token) && request.headers.get("Authorization") === "Bearer " + token; }
function validReport(report) {
  return Boolean(report && typeof report === "object" && typeof report.sessionId === "string" && report.sessionId.length > 0 &&
    report.sessionId.length <= 128 && typeof report.playerCode === "string" && report.playerCode.length > 0 &&
    report.playerCode.length <= 128 && Array.isArray(report.events) && report.events.length <= 10000);
}
async function parseJson(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return null;
  try { return JSON.parse(text); } catch { return undefined; }
}
async function countSessions(env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM sessions").first();
  return Number(row?.count || 0);
}
async function trimSessions(env) {
  const count = await countSessions(env);
  if (count <= MAX_SESSIONS) return;
  await env.DB.prepare("DELETE FROM sessions WHERE id IN (SELECT id FROM sessions ORDER BY received_at ASC LIMIT ?)").bind(count - MAX_SESSIONS).run();
}
async function handlePost(request, env) {
  if (!authorized(request, env.AUTHOR_TOKEN)) return json(env, 401, {error:"Unauthorized"});
  const payload = await parseJson(request);
  if (payload === null) return json(env, 413, {error:"Payload too large"});
  if (payload === undefined || !validReport(payload?.report)) return json(env, 400, {error:"Invalid JSON or session report"});
  const report = payload.report, id = report.sessionId;
  const existing = await env.DB.prepare("SELECT completed FROM sessions WHERE id = ?").bind(id).first();
  if (existing?.completed && !payload.completed) return json(env, 200, {ok:true,id,preservedCompleted:true});
  await env.DB.prepare(
    "INSERT INTO sessions (id, player_code, received_at, completed, report_json) VALUES (?, ?, ?, ?, ?) " +
    "ON CONFLICT(id) DO UPDATE SET player_code=excluded.player_code, received_at=excluded.received_at, completed=excluded.completed, report_json=excluded.report_json"
  ).bind(id, report.playerCode, new Date().toISOString(), payload.completed ? 1 : 0, JSON.stringify(report)).run();
  await trimSessions(env);
  return json(env, 201, {ok:true,id});
}
async function handlePatientPost(request, env) {
  if (!authorized(request, env.ADMIN_TOKEN)) return json(env,401,{error:"Unauthorized"});
  const payload = await parseJson(request);
  const name = String(payload?.name || "").trim();
  let code = String(payload?.code || "").trim().toUpperCase();
  if (!name || name.length > 200) return json(env,400,{error:"Invalid patient name"});
  if (!code) code = "P-" + crypto.randomInt(100000, 1000000);
  if (!/^[A-Z0-9_-]{4,64}$/.test(code)) return json(env,400,{error:"Invalid patient code"});
  const exists = await env.DB.prepare("SELECT code FROM patients WHERE code = ?").bind(code).first();
  if (exists) return json(env,409,{error:"Patient code already exists"});
  const patient = {code,name,createdAt:new Date().toISOString()};
  await env.DB.prepare("INSERT INTO patients (code,name,created_at) VALUES (?,?,?)").bind(code,name,patient.createdAt).run();
  return json(env,201,{ok:true,patient});
}
async function handlePatientList(url, env) {
  if (!authorized(new Request(url), env.ADMIN_TOKEN)) return json(env,401,{error:"Unauthorized"});
  const search = String(new URL(url).searchParams.get("search") || "").trim();
  let rows;
  if (search) {
    const like = "%" + search.replace(/[%_]/g, "\\async function handleList(url,env) {") + "%";
    rows = (await env.DB.prepare("SELECT code,name,created_at FROM patients WHERE code LIKE ? ESCAPE \\\\ OR name LIKE ? ESCAPE \\\\ ORDER BY created_at DESC LIMIT 100").bind(like,like).all()).results;
  } else rows = (await env.DB.prepare("SELECT code,name,created_at FROM patients ORDER BY created_at DESC LIMIT 100").all()).results;
  return json(env,200,{patients:rows.map(r=>({code:r.code,name:r.name,createdAt:r.created_at}))});
}
async function handleList(url, env) {
  const patientCode = String(url.searchParams.get("patientCode") || "").trim();
  const query = patientCode
    ? "SELECT id, player_code, received_at, completed, report_json FROM sessions WHERE player_code = ? ORDER BY received_at DESC"
    : "SELECT id, player_code, received_at, completed, report_json FROM sessions ORDER BY received_at DESC";
  const {results} = patientCode ? await env.DB.prepare(query).bind(patientCode).all() : await env.DB.prepare(query).all();
  const sessions = results.map(row => {
    const report = JSON.parse(row.report_json);
    return {id:row.id,playerCode:row.player_code,receivedAt:row.received_at,completed:Boolean(row.completed),
      sessionId:report.sessionId,eventCount:report.eventCount,sessionDurationMs:report.sessionDurationMs,completedRooms:report.completedRooms,path:report.path};
  });
  return json(env,200,{sessions});
}
async function handleGet(id, env) {
  const row = await env.DB.prepare("SELECT id, player_code, received_at, completed, report_json FROM sessions WHERE id = ?").bind(id).first();
  if (!row) return json(env,404,{error:"Not found"});
  return json(env,200,{id:row.id,playerCode:row.player_code,receivedAt:row.received_at,completed:Boolean(row.completed),report:JSON.parse(row.report_json)});
}
export default {
  async fetch(request, env) {
    if (!env.CORS_ORIGIN && env.ENVIRONMENT === "production") return json(env,500,{error:"CORS_ORIGIN must be configured"});
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null,{status:204,headers:corsHeaders(env)});
    if (url.pathname === "/api/health" && request.method === "GET") return json(env,200,{ok:true});
    if (url.pathname === "/api/sessions" && request.method === "POST") {
      try { return await handlePost(request,env); } catch (error) { console.error(error); return json(env,500,{error:"Storage failure"}); }
    }
    if (url.pathname === "/api/patients" && request.method === "POST") {
      try { return await handlePatientPost(request,env); } catch (error) { console.error(error); return json(env,500,{error:"Storage failure"}); }
    }
    if (url.pathname === "/api/patients" && request.method === "GET") {
      if (!authorized(request,env.ADMIN_TOKEN)) return json(env,401,{error:"Unauthorized"});
      try {
        const search = String(url.searchParams.get("search") || "").trim();
        let results;
        if (search) { const like = "%" + search.replace(/[%_]/g, "\\if (url.pathname === "/api/sessions" && request.method === "GET") {") + "%"; results=(await env.DB.prepare("SELECT code,name,created_at FROM patients WHERE code LIKE ? ESCAPE \\\\ OR name LIKE ? ESCAPE \\\\ ORDER BY created_at DESC LIMIT 100").bind(like,like).all()).results; }
        else results=(await env.DB.prepare("SELECT code,name,created_at FROM patients ORDER BY created_at DESC LIMIT 100").all()).results;
        return json(env,200,{patients:results.map(r=>({code:r.code,name:r.name,createdAt:r.created_at}))});
      } catch(error){console.error(error);return json(env,500,{error:"Storage failure"});}
    }
    if (url.pathname === "/api/sessions" && request.method === "GET") {
      if (!authorized(request,env.ADMIN_TOKEN)) return json(env,401,{error:"Unauthorized"});
      try { return await handleList(env); } catch (error) { console.error(error); return json(env,500,{error:"Storage failure"}); }
    }
    if (url.pathname.startsWith("/api/sessions/") && request.method === "GET") {
      if (!authorized(request,env.ADMIN_TOKEN)) return json(env,401,{error:"Unauthorized"});
      try { return await handleGet(decodeURIComponent(url.pathname.slice("/api/sessions/".length)),env); }
      catch (error) { console.error(error); return json(env,500,{error:"Storage failure"}); }
    }
    return json(env,404,{error:"Not found"});
  }
};
