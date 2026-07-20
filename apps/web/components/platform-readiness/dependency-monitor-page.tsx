"use client";

import { Activity, AlertTriangle, ArrowDown, Bot, CheckCircle2, ChevronRight, Circle, Clock3, CloudCog, Database, FileCheck2, FileClock, GitBranch, KeyRound, LockKeyhole, Newspaper, Radio, RefreshCw, Route, Server, ShieldCheck, Waypoints, XCircle, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./dependency-monitor-page.module.css";

type DependencyState="waiting"|"probing"|"healthy"|"blocked";
type Layer="Foundation"|"Data"|"Authority"|"Execution";
type Dependency={id:string;name:string;short:string;layer:Layer;requires:string[];consumer:string;contract:string;icon:typeof Server;state:DependencyState};
const definitions:Dependency[]=[
  {id:"config",name:"Configuration Registry",short:"CFG",layer:"Foundation",requires:[],consumer:"Lifecycle Engine",contract:"Signed configuration manifest",icon:FileCheck2,state:"waiting"},
  {id:"database",name:"Operational Database",short:"DB",layer:"Foundation",requires:["config"],consumer:"State & evidence",contract:"Transactional read/write",icon:Database,state:"waiting"},
  {id:"events",name:"Event Transport",short:"EVT",layer:"Foundation",requires:["database"],consumer:"All engines & agents",contract:"Typed durable delivery",icon:Waypoints,state:"waiting"},
  {id:"market",name:"Market Data Feed",short:"MKT",layer:"Data",requires:["config","events"],consumer:"Market Intelligence",contract:"Fresh consensus prices",icon:Radio,state:"waiting"},
  {id:"news",name:"News & Calendar",short:"NWS",layer:"Data",requires:["events"],consumer:"News Intelligence",contract:"Current event coverage",icon:Newspaper,state:"waiting"},
  {id:"risk",name:"Risk Authority Channel",short:"RSK",layer:"Authority",requires:["database","events","market"],consumer:"Decision & execution",contract:"Independent veto path",icon:ShieldCheck,state:"waiting"},
  {id:"broker",name:"Broker Gateway",short:"BRK",layer:"Execution",requires:["market","risk"],consumer:"Execution Engine",contract:"Authenticated order route",icon:Zap,state:"waiting"},
  {id:"audit",name:"Immutable Audit Store",short:"AUD",layer:"Execution",requires:["database","events"],consumer:"Lifecycle governance",contract:"Append-only evidence",icon:FileClock,state:"waiting"},
];
const layers:Layer[]=["Foundation","Data","Authority","Execution"];

export function DependencyMonitorPage(){
  const[dependencies,setDependencies]=useState(definitions);const[cycle,setCycle]=useState(0);const[retryIn,setRetryIn]=useState(90);const[scanning,setScanning]=useState(false);const timers=useRef<number[]>([]);const retryRef=useRef(90);
  const scan=useCallback(()=>{timers.current.forEach(window.clearTimeout);timers.current=[];retryRef.current=90;setRetryIn(90);setCycle(v=>v+1);setScanning(true);setDependencies(definitions.map(d=>({...d,state:"waiting"})));definitions.forEach((dependency,index)=>{const start=window.setTimeout(()=>setDependencies(current=>current.map(d=>d.id===dependency.id?{...d,state:"probing"}:d)),index*150);const finish=window.setTimeout(()=>{setDependencies(current=>current.map(d=>d.id===dependency.id?{...d,state:"blocked"}:d));if(index===definitions.length-1)setScanning(false)},index*150+600);timers.current.push(start,finish)})},[]);
  useEffect(()=>{scan();const interval=window.setInterval(()=>{const next=retryRef.current-1;if(next<=0)scan();else{retryRef.current=next;setRetryIn(next)}},1000);return()=>{window.clearInterval(interval);timers.current.forEach(window.clearTimeout)}},[scan]);
  const counts=useMemo(()=>({healthy:dependencies.filter(d=>d.state==="healthy").length,blocked:dependencies.filter(d=>d.state==="blocked").length,probing:dependencies.filter(d=>d.state==="probing").length,waiting:dependencies.filter(d=>d.state==="waiting").length}),[dependencies]);
  const assessed=counts.healthy+counts.blocked;const progress=Math.round(assessed/dependencies.length*100);const resolved=dependencies.every(d=>d.state==="healthy");
  return <main className={styles.page}>
    <nav className={styles.breadcrumb}><a href="/platform-readiness">Platform Readiness</a><ChevronRight size={13}/><a href="/platform-readiness/initialize">Initialize</a><ChevronRight size={13}/><strong>Dependency Monitor</strong></nav>
    <header className={styles.heading}><div className={styles.title}><span><GitBranch size={24}/></span><div><small>INITIALIZE · CONTROL GROUP 05</small><h1>Dependency Monitor</h1><p>Live contract resolution, startup ordering, and blocked-path propagation.</p></div></div><div className={styles.scanState}><RefreshCw className={scanning?styles.spin:""} size={16}/><span><small>RESOLUTION CYCLE #{cycle}</small><strong>{scanning?"SCANNING GRAPH":`MONITORING · RETRY ${retryIn}S`}</strong></span></div></header>

    <section className={`${styles.decisionBar} ${resolved?styles.resolved:""}`}><div>{resolved?<CheckCircle2 size={20}/>:<LockKeyhole size={20}/>}<span><small>DEPENDENCY DECISION</small><strong>{resolved?"ALL STARTUP CONTRACTS RESOLVED":"INITIALIZATION PATH BLOCKED"}</strong></span></div><p>{resolved?"The orchestrator may continue automatically.":"Unverified production contracts propagate HOLD to every downstream consumer. No dependency can be bypassed."}</p><div className={styles.metrics}><span><b>{counts.healthy}</b>Healthy</span><span><b>{counts.probing}</b>Probing</span><span><b>{counts.blocked}</b>Blocked</span><span><b>{progress}%</b>Assessed</span></div></section>

    <div className={styles.workspace}>
      <section className={styles.graphPanel}>
        <header><div><Route size={18}/><span><h2>Runtime Dependency Graph</h2><p>Edges represent required production contracts and propagate failure forward.</p></span></div><b><i/>LIVE TOPOLOGY</b></header>
        <div className={styles.graphCanvas}>
          <div className={styles.gridLines}/>
          {layers.map((layer,layerIndex)=><section className={styles.graphLayer} key={layer}><div className={styles.layerTitle}><b>0{layerIndex+1}</b><span>{layer}</span><small>{dependencies.filter(d=>d.layer===layer).length} NODES</small></div><div className={styles.nodes}>{dependencies.filter(d=>d.layer===layer).map(dependency=>{const Icon=dependency.icon;return <article className={`${styles.node} ${styles[dependency.state]}`} key={dependency.id}><div className={styles.nodeHead}><span><Icon size={17}/><b>{dependency.short}</b></span><em>{stateIcon(dependency.state)}{dependency.state==="probing"?"PROBING":dependency.state==="blocked"?"BLOCKED":dependency.state.toUpperCase()}</em></div><h3>{dependency.name}</h3><p>{dependency.contract}</p><div><small>CONSUMER</small><strong>{dependency.consumer}</strong></div>{dependency.requires.length?<footer><GitBranch size={10}/>requires {dependency.requires.map(id=>definitions.find(d=>d.id===id)?.short).join(" + ")}</footer>:<footer><CheckCircle2 size={10}/>root dependency</footer>}</article>})}</div>{layerIndex<layers.length-1?<div className={styles.layerLink}><ArrowDown size={14}/></div>:null}</section>)}
        </div>
      </section>

      <aside className={styles.resolverPanel}>
        <div className={styles.resolverHead}><span><Bot size={21}/></span><div><small>AUTONOMOUS CONTROLLER</small><h2>Graph Resolver</h2><p>Continuous · deterministic</p></div><i/></div>
        <div className={styles.progress}><div style={{"--progress":`${progress*3.6}deg`} as React.CSSProperties}><span><b>{progress}%</b><small>ASSESSED</small></span></div></div>
        <div className={styles.legend}><span><i className={styles.green}/>Healthy <b>{counts.healthy}</b></span><span><i className={styles.blue}/>Probing <b>{counts.probing}</b></span><span><i className={styles.gray}/>Waiting <b>{counts.waiting}</b></span><span><i className={styles.red}/>Blocked <b>{counts.blocked}</b></span></div>
        <div className={styles.critical}><AlertTriangle size={15}/><div><small>CRITICAL PATH</small><strong>CFG → DB → EVT → MKT → RSK → BRK</strong><p>Longest required path is held at its first unavailable production binding.</p></div></div>
        <dl><div><dt>Resolution order</dt><dd>TOPOLOGICAL</dd></div><div><dt>Cycle handling</dt><dd>REJECT</dd></div><div><dt>Missing contract</dt><dd>HOLD</dd></div><div><dt>Manual override</dt><dd>PROHIBITED</dd></div></dl>
      </aside>
    </div>

    <section className={styles.contracts}>
      <header><div><KeyRound size={18}/><span><h2>Contract Resolution Ledger</h2><p>Current evidence for every required edge.</p></span></div><a href="/platform-readiness/initialize/initialization-logs">View initialization audit <ChevronRight size={13}/></a></header>
      <div className={styles.tableHead}><span>Dependency</span><span>Required by</span><span>Contract</span><span>Evidence</span><span>Propagation</span></div>
      {dependencies.map(dependency=><div className={styles.tableRow} key={dependency.id}><strong>{dependency.name}</strong><span>{dependency.consumer}</span><span>{dependency.contract}</span><b><XCircle size={11}/>No production evidence</b><em>Blocks {dependency.id==="config"?"7":dependency.id==="database"?"5":dependency.id==="events"?"5":dependency.id==="market"?"2":"1"} downstream</em></div>)}
      <footer><CloudCog size={14}/><span>All graph changes, failed probes, propagation decisions, and retry schedules are retained automatically.</span><time><Clock3 size={12}/>Next autonomous scan in {retryIn}s</time></footer>
    </section>
  </main>
}
function stateIcon(state:DependencyState){if(state==="healthy")return <CheckCircle2 size={11}/>;if(state==="probing")return <RefreshCw className={styles.spin} size={11}/>;if(state==="blocked")return <XCircle size={11}/>;return <Circle size={11}/>}
