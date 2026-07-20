"use client";

import { Activity, AlertTriangle, BellRing, Bot, CalendarClock, CheckCircle2, ChevronRight, Circle, CloudCog, Database, FileClock, FileSearch, KeyRound, LockKeyhole, Newspaper, Radio, RefreshCw, ServerCog, ShieldCheck, TimerReset, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./service-initialization-page.module.css";

type ServiceState="queued"|"connecting"|"ready"|"blocked";
type Service={id:string;name:string;label:string;role:string;prerequisite:string;checks:string[];icon:typeof ServerCog;layer:"Foundation"|"Data"|"Transport"|"Control";state:ServiceState};
const definitions:Service[]=[
  {id:"database",name:"Operational Database",label:"DB",role:"Durable state, checkpoints, and transactional records.",prerequisite:"Database credentials",checks:["Connectivity","Schema","Write durability"],icon:Database,layer:"Foundation",state:"queued"},
  {id:"market",name:"Market Data Service",label:"MD",role:"Live price, spread, session, and instrument data.",prerequisite:"Provider endpoint",checks:["Feed health","Clock skew","Consensus"],icon:Radio,layer:"Data",state:"queued"},
  {id:"news",name:"News & Calendar",label:"NC",role:"Economic events, news, impact, and embargo state.",prerequisite:"Market Data Service",checks:["News stream","Calendar sync","Coverage"],icon:Newspaper,layer:"Data",state:"queued"},
  {id:"messaging",name:"Messaging Service",label:"MQ",role:"Typed transport for engine, agent, and alert traffic.",prerequisite:"Operational Database",checks:["Event bus","Delivery","Dead letters"],icon:BellRing,layer:"Transport",state:"queued"},
  {id:"audit",name:"Audit Evidence",label:"AU",role:"Immutable decisions, evidence, controls, and access history.",prerequisite:"Messaging Service",checks:["Append store","Integrity seal","Retention"],icon:FileSearch,layer:"Control",state:"queued"},
  {id:"scheduler",name:"Autonomous Scheduler",label:"SC",role:"Recurring work, retries, deadlines, and recovery triggers.",prerequisite:"Audit Evidence",checks:["Leader lock","Clock source","Recovery queue"],icon:CalendarClock,layer:"Control",state:"queued"},
];

export function ServiceInitializationPage(){
  const[services,setServices]=useState(definitions);const[cycle,setCycle]=useState(0);const[retryIn,setRetryIn]=useState(90);const[active,setActive]=useState(false);const timers=useRef<number[]>([]);const retryRef=useRef(90);
  const run=useCallback(()=>{timers.current.forEach(window.clearTimeout);timers.current=[];retryRef.current=90;setRetryIn(90);setCycle(v=>v+1);setActive(true);setServices(definitions.map(s=>({...s,state:"queued"})));definitions.forEach((service,index)=>{const start=window.setTimeout(()=>setServices(current=>current.map(s=>s.id===service.id?{...s,state:"connecting"}:s)),index*190);const finish=window.setTimeout(()=>{setServices(current=>current.map(s=>s.id===service.id?{...s,state:"blocked"}:s));if(index===definitions.length-1)setActive(false)},index*190+660);timers.current.push(start,finish)})},[]);
  useEffect(()=>{run();const interval=window.setInterval(()=>{const next=retryRef.current-1;if(next<=0)run();else{retryRef.current=next;setRetryIn(next)}},1000);return()=>{window.clearInterval(interval);timers.current.forEach(window.clearTimeout)}},[run]);
  const counts=useMemo(()=>({ready:services.filter(s=>s.state==="ready").length,blocked:services.filter(s=>s.state==="blocked").length,connecting:services.filter(s=>s.state==="connecting").length,queued:services.filter(s=>s.state==="queued").length}),[services]);
  const progress=Math.round(((counts.ready+counts.blocked)/services.length)*100);const ready=services.every(s=>s.state==="ready");
  return <main className={styles.page}>
    <nav className={styles.breadcrumb}><a href="/platform-readiness">Platform Readiness</a><ChevronRight size={13}/><a href="/platform-readiness/initialize">Initialize</a><ChevronRight size={13}/><strong>Service Initialization</strong></nav>
    <header className={styles.heading}><div className={styles.headingMain}><span className={styles.serverIcon}><ServerCog size={25}/></span><div><span>INITIALIZE · INFRASTRUCTURE LAYER 04</span><h1>Service Initialization</h1><p>Production connectivity, durability, freshness, messaging, evidence, and scheduling.</p></div></div><div className={styles.headingMeta}><span><i className={active?styles.pulse:""}/>{active?"DISCOVERING SERVICES":"CONTINUOUS MONITORING"}</span><small>Cycle #{cycle} · retry {retryIn}s</small></div></header>

    <section className={`${styles.systemBanner} ${ready?styles.systemReady:""}`}>
      <div className={styles.bannerState}>{ready?<CheckCircle2 size={24}/>:<LockKeyhole size={24}/>}<span><small>SERVICE MESH DECISION</small><strong>{ready?"PRODUCTION SERVICE LAYER READY":"INITIALIZATION HELD — PRODUCTION ENDPOINTS UNAVAILABLE"}</strong></span></div>
      <div className={styles.bannerMetrics}><div><small>Required</small><b>{services.length}</b></div><div><small>Operational</small><b>{counts.ready}</b></div><div><small>Connecting</small><b>{counts.connecting}</b></div><div><small>Unavailable</small><b>{counts.blocked}</b></div><div><small>Assessed</small><b>{progress}%</b></div></div>
    </section>

    <div className={styles.layout}>
      <section className={styles.infrastructure}>
        <div className={styles.sectionTitle}><div><h2>Production Infrastructure Map</h2><p>Services are arranged by runtime layer and joined only through verified contracts.</p></div><span><CloudCog size={15}/>{active?"Health probes active":"Awaiting retry window"}</span></div>
        <div className={styles.layerMap}>
          {["Data","Foundation","Transport","Control"].map((layer,index)=><div className={styles.layer} key={layer}>
            <div className={styles.layerLabel}><b>0{index+1}</b><span>{layer}</span><i/></div>
            <div className={styles.serviceLane}>{services.filter(s=>s.layer===layer).map(service=>{const Icon=service.icon;return <article className={`${styles.serviceNode} ${styles[service.state]}`} key={service.id}>
              <div className={styles.nodeHead}><span className={styles.nodeIcon}><Icon size={19}/><b>{service.label}</b></span><span className={styles.nodeState}>{stateIcon(service.state)}{service.state==="connecting"?"CONNECTING":service.state==="blocked"?"UNAVAILABLE":service.state.toUpperCase()}</span></div>
              <h3>{service.name}</h3><p>{service.role}</p><div className={styles.endpoint}><small>PREREQUISITE</small><strong>{service.prerequisite}</strong></div><div className={styles.checks}>{service.checks.map(check=><span key={check}><Circle size={6}/>{check}</span>)}</div>
            </article>})}</div>
          </div>)}
        </div>
      </section>

      <aside className={styles.telemetry}>
        <div className={styles.telemetryHead}><span><Activity size={18}/></span><div><h2>Live Telemetry</h2><p>Admission evidence from production probes</p></div></div>
        <div className={styles.progress}><div><span style={{width:`${progress}%`}}/></div><small>{progress}% of service checks assessed</small></div>
        <div className={styles.signalList}><Signal label="Endpoint reachability" value="No evidence"/><Signal label="Identity exchange" value="Unverified"/><Signal label="Write durability" value="Unverified"/><Signal label="Data freshness" value="No samples"/><Signal label="Recovery path" value="Unverified"/><Signal label="Audit transport" value="Offline"/></div>
        <div className={styles.controller}><Bot size={18}/><span><strong>Infrastructure Orchestrator</strong><small>Automatic · strict order · fail closed</small></span></div>
        <dl className={styles.facts}><div><dt>Retry policy</dt><dd>BOUNDED</dd></div><div><dt>Mock fallback</dt><dd>PROHIBITED</dd></div><div><dt>Manual approval</dt><dd>NOT REQUIRED</dd></div><div><dt>Outcome</dt><dd className={styles.hold}>HOLD</dd></div></dl>
      </aside>
    </div>

    <section className={styles.evidenceBoard}>
      <div className={styles.evidenceTitle}><FileClock size={18}/><div><h2>Service Admission Evidence</h2><p>Every probe, decision, and retry is written automatically.</p></div></div>
      <div className={styles.evidenceGrid}><Evidence icon={KeyRound} title="Authenticated endpoint"/><Evidence icon={Activity} title="Live health proof"/><Evidence icon={Database} title="Durable write path"/><Evidence icon={TimerReset} title="Deterministic recovery"/><Evidence icon={ShieldCheck} title="Least privilege"/></div>
      <div className={styles.warning}><AlertTriangle size={15}/><span><strong>No synthetic readiness.</strong> Local substitutes, cached success, and inferred health cannot satisfy production admission.</span></div>
    </section>
  </main>
}

function Signal({label,value}:{label:string;value:string}){return <div><span>{label}</span><b>{value}</b></div>}
function Evidence({icon:Icon,title}:{icon:typeof ServerCog;title:string}){return <div><Icon size={15}/><span>{title}</span><b>UNVERIFIED</b></div>}
function stateIcon(state:ServiceState){if(state==="ready")return <CheckCircle2 size={11}/>;if(state==="connecting")return <RefreshCw className={styles.spin} size={11}/>;if(state==="blocked")return <XCircle size={11}/>;return <Circle size={11}/>}
