"use client";

import { Activity, AlertTriangle, ArrowRight, Bot, BrainCircuit, CheckCircle2, ChevronRight, Circle, Cpu, FileClock, GitBranch, LockKeyhole, RefreshCw, ShieldCheck, Sparkles, Workflow, XCircle, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./engine-initialization-page.module.css";

type EngineState="queued"|"binding"|"ready"|"blocked";
type Engine={id:string;name:string;short:string;role:string;dependency:string;capabilities:string[];icon:typeof Cpu;color:string;state:EngineState};
const definitions:Engine[]=[
  {id:"lifecycle",name:"Lifecycle Engine",short:"LCE",role:"Stage transitions, orchestration, recovery.",dependency:"Configuration registry",capabilities:["State machine","Recovery","Event routing"],icon:Workflow,color:"violet",state:"queued"},
  {id:"intelligence",name:"Market Intelligence",short:"MIE",role:"Market analysis and governed interpretation.",dependency:"Lifecycle Engine",capabilities:["Analysis","Regime","Context"],icon:Sparkles,color:"blue",state:"queued"},
  {id:"risk",name:"Risk Authority",short:"RAE",role:"Independent controls and non-bypassable veto.",dependency:"Market Intelligence",capabilities:["Limits","Veto","Kill policy"],icon:ShieldCheck,color:"amber",state:"queued"},
  {id:"execution",name:"Execution Engine",short:"EXE",role:"Order routing, fill control, reconciliation.",dependency:"Risk Authority",capabilities:["Orders","Fills","Reconcile"],icon:Zap,color:"red",state:"queued"},
  {id:"learning",name:"Learning Engine",short:"LNE",role:"Outcome review, bounded memory, optimization.",dependency:"Execution Engine",capabilities:["Review","Memory","Drift"],icon:BrainCircuit,color:"green",state:"queued"},
];

export function EngineInitializationPage(){
  const[engines,setEngines]=useState(definitions);const[cycle,setCycle]=useState(0);const[retryIn,setRetryIn]=useState(90);const[active,setActive]=useState(false);const timers=useRef<number[]>([]);const retryRef=useRef(90);
  const run=useCallback(()=>{timers.current.forEach(window.clearTimeout);timers.current=[];retryRef.current=90;setRetryIn(90);setCycle(v=>v+1);setActive(true);setEngines(definitions.map(e=>({...e,state:"queued"})));definitions.forEach((engine,index)=>{const start=window.setTimeout(()=>setEngines(current=>current.map(e=>e.id===engine.id?{...e,state:"binding"}:e)),index*210);const finish=window.setTimeout(()=>{setEngines(current=>current.map(e=>e.id===engine.id?{...e,state:"blocked"}:e));if(index===definitions.length-1)setActive(false)},index*210+720);timers.current.push(start,finish)})},[]);
  useEffect(()=>{run();const interval=window.setInterval(()=>{const next=retryRef.current-1;if(next<=0)run();else{retryRef.current=next;setRetryIn(next)}},1000);return()=>{window.clearInterval(interval);timers.current.forEach(window.clearTimeout)}},[run]);
  const counts=useMemo(()=>({ready:engines.filter(e=>e.state==="ready").length,blocked:engines.filter(e=>e.state==="blocked").length,binding:engines.filter(e=>e.state==="binding").length,queued:engines.filter(e=>e.state==="queued").length}),[engines]);
  const progress=Math.round(((counts.ready+counts.blocked)/engines.length)*100);const ready=engines.every(e=>e.state==="ready");
  return <main className={styles.page}>
    <nav className={styles.breadcrumb}><a href="/platform-readiness">Platform Readiness</a><ChevronRight size={13}/><a href="/platform-readiness/initialize">Initialize</a><ChevronRight size={13}/><strong>Engine Initialization</strong></nav>
    <header className={styles.heading}><div><span>CONTROL GROUP 02 · RUNTIME AUTHORITIES</span><h1><Cpu size={28}/>Engine Initialization</h1><p>Booting isolated engines through a strict, evidence-backed dependency chain.</p></div><div className={styles.cycle}><RefreshCw className={active?styles.spin:""} size={17}/><span><small>AUTONOMOUS CYCLE</small><strong>#{cycle} · {active?"BOOTING":`RETRY IN ${retryIn}S`}</strong></span></div></header>

    <section className={styles.controlRoom}>
      <div className={styles.controlHeader}><div><span className={styles.liveDot}/><strong>ENGINE BUS / INITIALIZATION CHANNEL</strong><small>Ordered · idempotent · fail closed</small></div><div className={`${styles.decision} ${ready?styles.good:""}`}>{ready?<CheckCircle2 size={14}/>:<LockKeyhole size={14}/>} {ready?"ALL AUTHORITIES ONLINE":active?"BOOT SEQUENCE ACTIVE":"ENGINE BUS LOCKED"}</div></div>
      <div className={styles.bus}>
        <div className={styles.busLine}/>
        {engines.map((engine,index)=>{const Icon=engine.icon;return <div className={styles.nodeWrap} key={engine.id}>
          <article className={`${styles.node} ${styles[engine.color]} ${styles[engine.state]}`}>
            <div className={styles.nodeTop}><span>{engine.short}</span><b>{stateIcon(engine.state)}{engine.state==="binding"?"BINDING":engine.state==="blocked"?"OFFLINE":engine.state.toUpperCase()}</b></div>
            <div className={styles.nodeCore}><Icon size={25}/><i/></div><h2>{engine.name}</h2><p>{engine.role}</p>
            <div className={styles.caps}>{engine.capabilities.map(cap=><span key={cap}>{cap}</span>)}</div><div className={styles.dep}><small>REQUIRES</small><strong>{engine.dependency}</strong></div>
          </article>{index<engines.length-1?<ArrowRight className={styles.arrow} size={18}/>:null}
        </div>})}
      </div>
      <div className={styles.busFooter}><span><GitBranch size={14}/>Dependency graph sealed for cycle #{cycle}</span><b>{progress}% ASSESSED</b><div><i style={{width:`${progress}%`}}/></div></div>
    </section>

    <div className={styles.lowerGrid}>
      <section className={styles.diagnostics}>
        <header><div><Activity size={18}/><span><h2>Boot Diagnostics</h2><p>Production bindings and authority contracts</p></span></div><b>{active?"STREAMING":"SNAPSHOT"}</b></header>
        <div className={styles.tableHead}><span>Engine authority</span><span>Manifest</span><span>Event contract</span><span>State recovery</span><span>Runtime</span></div>
        {engines.map(engine=><div className={styles.tableRow} key={engine.id}><strong>{engine.name}</strong><span><Circle size={7}/>Resolved</span><span><XCircle size={10}/>Unbound</span><span><XCircle size={10}/>Unverified</span><b>{engine.state==="binding"?"BINDING":"HELD"}</b></div>)}
      </section>
      <aside className={styles.authority}>
        <header><ShieldCheck size={19}/><div><h2>Authority Boundary</h2><p>Runtime separation enforced</p></div></header>
        <div className={styles.boundary}><span>Lifecycle</span><b>May orchestrate</b><small>Cannot authorize trades</small></div><div className={styles.boundary}><span>Intelligence</span><b>May observe</b><small>Cannot execute orders</small></div><div className={styles.boundary}><span>Risk</span><b>May veto</b><small>Cannot be overridden</small></div><div className={styles.boundary}><span>Execution</span><b>May route</b><small>Requires risk authorization</small></div><div className={styles.boundary}><span>Learning</span><b>May recommend</b><small>Cannot mutate live policy</small></div>
      </aside>
    </div>

    <section className={styles.auditBar}><div><Bot size={17}/><span><strong>Lifecycle Orchestrator</strong><small>{active?"Binding runtime authorities in strict order":"Monitoring production bindings"}</small></span></div><div><span>Operational</span><b>{counts.ready}</b></div><div><span>Binding</span><b>{counts.binding}</b></div><div><span>Queued</span><b>{counts.queued}</b></div><div><span>Blocked</span><b>{counts.blocked}</b></div><p><AlertTriangle size={14}/><span><strong>Fail closed:</strong> no simulated engine readiness</span></p><a href="/platform-readiness/initialize/initialization-logs"><FileClock size={14}/>Audit evidence <ChevronRight size={12}/></a></section>
  </main>
}
function stateIcon(state:EngineState){if(state==="ready")return <CheckCircle2 size={11}/>;if(state==="binding")return <RefreshCw className={styles.spin} size={11}/>;if(state==="blocked")return <XCircle size={11}/>;return <Circle size={11}/>}
