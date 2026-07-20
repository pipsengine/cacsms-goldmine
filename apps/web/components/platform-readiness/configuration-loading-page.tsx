"use client";

import { AlertTriangle, Bot, Braces, CheckCircle2, ChevronRight, Circle, Clock3, Code2, Database, FileCheck2, FileClock, FileJson2, Fingerprint, GitMerge, KeyRound, Layers3, LockKeyhole, RefreshCw, ScrollText, Settings2, ShieldCheck, SlidersHorizontal, Workflow, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./configuration-loading-page.module.css";

type ConfigState="queued"|"loading"|"verified"|"rejected";
type Config={id:string;name:string;file:string;purpose:string;schema:string;fields:number;priority:number;icon:typeof FileJson2;state:ConfigState};
const definitions:Config[]=[
  {id:"environment",name:"Environment Configuration",file:"environment.production.json",purpose:"Runtime identity, regions, endpoints, and feature boundaries.",schema:"gold.environment/v3",fields:18,priority:1,icon:Settings2,state:"queued"},
  {id:"trading",name:"Trading Configuration",file:"trading.xauusd.json",purpose:"Instrument, session, operating mode, and execution behavior.",schema:"gold.trading/v5",fields:27,priority:2,icon:SlidersHorizontal,state:"queued"},
  {id:"strategy",name:"Strategy Configuration",file:"strategies.approved.json",purpose:"Eligible strategies, regimes, parameters, and confidence rules.",schema:"gold.strategy/v4",fields:34,priority:3,icon:Braces,state:"queued"},
  {id:"risk",name:"Risk Configuration",file:"risk.conservative.json",purpose:"Exposure limits, drawdown boundaries, vetoes, and kill policy.",schema:"gold.risk/v6",fields:31,priority:4,icon:ShieldCheck,state:"queued"},
  {id:"lifecycle",name:"Lifecycle Configuration",file:"lifecycle.autonomous.json",purpose:"Stage transitions, recovery, retries, and audit obligations.",schema:"gold.lifecycle/v3",fields:22,priority:5,icon:Workflow,state:"queued"},
];

export function ConfigurationLoadingPage(){
  const[configs,setConfigs]=useState(definitions);const[selected,setSelected]=useState("environment");const[cycle,setCycle]=useState(0);const[retryIn,setRetryIn]=useState(90);const[loading,setLoading]=useState(false);const timers=useRef<number[]>([]);const retryRef=useRef(90);
  const load=useCallback(()=>{timers.current.forEach(window.clearTimeout);timers.current=[];retryRef.current=90;setRetryIn(90);setCycle(v=>v+1);setLoading(true);setConfigs(definitions.map(c=>({...c,state:"queued"})));definitions.forEach((config,index)=>{const start=window.setTimeout(()=>setConfigs(current=>current.map(c=>c.id===config.id?{...c,state:"loading"}:c)),index*180);const finish=window.setTimeout(()=>{setConfigs(current=>current.map(c=>c.id===config.id?{...c,state:"rejected"}:c));if(index===definitions.length-1)setLoading(false)},index*180+650);timers.current.push(start,finish)})},[]);
  useEffect(()=>{load();const interval=window.setInterval(()=>{const next=retryRef.current-1;if(next<=0)load();else{retryRef.current=next;setRetryIn(next)}},1000);return()=>{window.clearInterval(interval);timers.current.forEach(window.clearTimeout)}},[load]);
  const counts=useMemo(()=>({verified:configs.filter(c=>c.state==="verified").length,rejected:configs.filter(c=>c.state==="rejected").length,loading:configs.filter(c=>c.state==="loading").length,queued:configs.filter(c=>c.state==="queued").length}),[configs]);
  const active=configs.find(c=>c.id===selected)??configs[0];const assessed=counts.verified+counts.rejected;const progress=Math.round(assessed/configs.length*100);const ready=configs.every(c=>c.state==="verified");
  return <main className={styles.page}>
    <nav className={styles.breadcrumb}><a href="/platform-readiness">Platform Readiness</a><ChevronRight size={13}/><a href="/platform-readiness/initialize">Initialize</a><ChevronRight size={13}/><strong>Configuration Loading</strong></nav>
    <header className={styles.heading}><div className={styles.title}><span><FileJson2 size={25}/></span><div><small>INITIALIZE · CONTROL GROUP 01</small><h1>Configuration Loading</h1><p>Signed manifest discovery, precedence resolution, schema validation, and secret binding.</p></div></div><div className={styles.loader}><RefreshCw className={loading?styles.spin:""} size={16}/><span><small>LOAD CYCLE #{cycle}</small><strong>{loading?"RESOLVING MANIFESTS":`MONITORING · RETRY ${retryIn}S`}</strong></span></div></header>

    <section className={`${styles.statusBand} ${ready?styles.statusReady:""}`}><div>{ready?<CheckCircle2 size={20}/>:<LockKeyhole size={20}/>}<span><small>CONFIGURATION DECISION</small><strong>{ready?"RESOLVED CONFIGURATION SEALED":"CONFIGURATION SET REJECTED"}</strong></span></div><p>{ready?"The immutable runtime snapshot may be distributed automatically.":"Production registry evidence is unavailable. Defaults, stale cache, and local files cannot satisfy initialization."}</p><div className={styles.stats}><span><b>{configs.length}</b>Bundles</span><span><b>{configs.reduce((sum,c)=>sum+c.fields,0)}</b>Fields</span><span><b>{counts.verified}</b>Verified</span><span><b>{counts.rejected}</b>Rejected</span></div></section>

    <div className={styles.vault}>
      <aside className={styles.manifestList}>
        <header><div><Layers3 size={17}/><span><h2>Manifest Vault</h2><p>Precedence order</p></span></div><b>{configs.length} FILES</b></header>
        <div className={styles.list}>{configs.map(config=>{const Icon=config.icon;return <button className={`${styles.manifest} ${selected===config.id?styles.selected:""}`} type="button" onClick={()=>setSelected(config.id)} key={config.id}><span className={styles.order}>0{config.priority}</span><span className={styles.manifestIcon}><Icon size={17}/></span><span className={styles.manifestName}><strong>{config.name}</strong><small>{config.file}</small></span><span className={`${styles.state} ${styles[config.state]}`}>{stateIcon(config.state)}</span></button>})}</div>
        <footer><GitMerge size={14}/><span>Later bundles may narrow—but never weaken—upstream safety policy.</span></footer>
      </aside>

      <section className={styles.viewer}>
        <header><div><span className={styles.fileIcon}><Code2 size={19}/></span><div><small>SELECTED MANIFEST</small><h2>{active.file}</h2></div></div><span className={`${styles.fileState} ${styles[active.state]}`}>{stateIcon(active.state)}{active.state==="loading"?"LOADING":active.state==="rejected"?"REJECTED":active.state.toUpperCase()}</span></header>
        <div className={styles.tabs}><span className={styles.activeTab}>Resolved view</span><span>Source</span><span>Schema</span><span>Change history</span></div>
        <div className={styles.editor}>
          <div className={styles.lineNumbers}>{Array.from({length:12},(_,i)=><span key={i}>{i+1}</span>)}</div>
          <pre><code>{`{
  "$schema": "${active.schema}",
  "environment": "production",
  "manifest": "${active.id}",
  "version": null,
  "source": {
    "registry": "unavailable",
    "signature": null,
    "digest": null
  },
  "resolved": false
}`}</code></pre>
          <div className={styles.editorEmpty}><AlertTriangle size={17}/><span><strong>No trusted payload resolved</strong><small>Production configuration registry has not returned signed evidence.</small></span></div>
        </div>
        <div className={styles.fileMeta}><div><small>SCHEMA</small><strong>{active.schema}</strong></div><div><small>EXPECTED FIELDS</small><strong>{active.fields}</strong></div><div><small>PRECEDENCE</small><strong>0{active.priority}</strong></div><div><small>LAST VERIFIED</small><strong>Never</strong></div></div>
        <div className={styles.purpose}><ScrollText size={15}/><span><small>MANIFEST PURPOSE</small><strong>{active.purpose}</strong></span></div>
      </section>

      <aside className={styles.provenance}>
        <header><Fingerprint size={18}/><div><h2>Trust Chain</h2><p>Required provenance evidence</p></div></header>
        <div className={styles.ring} style={{"--progress":`${progress*3.6}deg`} as React.CSSProperties}><span><b>{progress}%</b><small>ASSESSED</small></span></div>
        <div className={styles.gates}><Gate icon={Database} title="Registry source"/><Gate icon={KeyRound} title="Signing identity"/><Gate icon={Fingerprint} title="Content digest"/><Gate icon={FileCheck2} title="Schema contract"/><Gate icon={ShieldCheck} title="Policy integrity"/></div>
        <div className={styles.orchestrator}><Bot size={18}/><span><strong>Configuration Resolver</strong><small>Automatic · deterministic · fail closed</small></span></div>
        <dl><div><dt>Precedence</dt><dd>STRICT</dd></div><div><dt>Unknown fields</dt><dd>REJECT</dd></div><div><dt>Secret handling</dt><dd>REFERENCE ONLY</dd></div><div><dt>Manual override</dt><dd>PROHIBITED</dd></div></dl>
      </aside>
    </div>

    <section className={styles.auditBar}><div><FileClock size={16}/><span><strong>Autonomous configuration audit</strong><small>Discovery, merge order, validation errors, digests, and decisions are retained.</small></span></div><div><span>Queued</span><b>{counts.queued}</b></div><div><span>Loading</span><b>{counts.loading}</b></div><div><span>Verified</span><b>{counts.verified}</b></div><div><span>Rejected</span><b>{counts.rejected}</b></div><p><Clock3 size={13}/>Next registry resolution in {retryIn}s</p></section>
  </main>
}
function Gate({icon:Icon,title}:{icon:typeof FileJson2;title:string}){return <div><span><Icon size={13}/>{title}</span><b><XCircle size={11}/>UNVERIFIED</b></div>}
function stateIcon(state:ConfigState){if(state==="verified")return <CheckCircle2 size={12}/>;if(state==="loading")return <RefreshCw className={styles.spin} size={12}/>;if(state==="rejected")return <XCircle size={12}/>;return <Circle size={12}/>}
