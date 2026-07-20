"use client";

import { Activity, AlertTriangle, Bot, BrainCircuit, CheckCircle2, ChevronRight, Circle, Database, Eye, FileClock, Fingerprint, KeyRound, LockKeyhole, Newspaper, RefreshCw, ScanSearch, ShieldCheck, Sparkles, Target, TrendingUp, Workflow, XCircle, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./ai-agent-initialization-page.module.css";

type AgentState = "queued" | "registering" | "ready" | "blocked";
type Domain = "Orchestration" | "Intelligence" | "Decision" | "Execution" | "Learning";
type Agent = { id: string; name: string; short: string; role: string; authority: string; bindings: string[]; icon: typeof Bot; domain: Domain; state: AgentState };

const definitions: Agent[] = [
  { id:"orchestrator",name:"Lifecycle Orchestrator",short:"LO",role:"Coordinates lifecycle stages and recovery.",authority:"Lifecycle Engine",bindings:["Stage state","Event bus","Recovery"],icon:Workflow,domain:"Orchestration",state:"queued" },
  { id:"sentinel",name:"Market Data Sentinel",short:"MS",role:"Validates freshness, integrity, and source consensus.",authority:"Market services",bindings:["Price feeds","Quality rules","Quarantine"],icon:ScanSearch,domain:"Intelligence",state:"queued" },
  { id:"analyst",name:"Market Analysis Agent",short:"MA",role:"Builds governed technical market observations.",authority:"Intelligence Engine",bindings:["Indicators","Structure","Regime"],icon:TrendingUp,domain:"Intelligence",state:"queued" },
  { id:"news",name:"News Intelligence Agent",short:"NI",role:"Classifies event risk and macro context.",authority:"Intelligence Engine",bindings:["News feed","Calendar","Event policy"],icon:Newspaper,domain:"Intelligence",state:"queued" },
  { id:"strategy",name:"Strategy Selection Agent",short:"SS",role:"Selects strategies eligible for the current regime.",authority:"Strategy policy",bindings:["Registry","Eligibility","Confidence"],icon:Target,domain:"Decision",state:"queued" },
  { id:"risk",name:"Risk Guardian Agent",short:"RG",role:"Applies exposure controls and independent veto.",authority:"Risk Authority",bindings:["Risk profile","Limits","Veto"],icon:ShieldCheck,domain:"Decision",state:"queued" },
  { id:"decision",name:"Trade Decision Agent",short:"TD",role:"Creates auditable trade or no-trade decisions.",authority:"Decision policy",bindings:["Evidence","Schema","Rationale"],icon:BrainCircuit,domain:"Decision",state:"queued" },
  { id:"execution",name:"Execution Controller",short:"EC",role:"Converts authorized decisions into broker instructions.",authority:"Execution Engine",bindings:["Broker tools","Orders","Reconcile"],icon:Zap,domain:"Execution",state:"queued" },
  { id:"position",name:"Position Supervisor",short:"PS",role:"Monitors positions, exits, and risk state changes.",authority:"Position controls",bindings:["Positions","Exit rules","Escalation"],icon:Eye,domain:"Execution",state:"queued" },
  { id:"review",name:"Performance Review Agent",short:"PR",role:"Attributes outcomes and verifies policy adherence.",authority:"Review Engine",bindings:["Ledger","Attribution","Compliance"],icon:Activity,domain:"Learning",state:"queued" },
  { id:"learning",name:"Learning Curator Agent",short:"LC",role:"Writes approved lessons to bounded memory.",authority:"Learning Engine",bindings:["Memory","Drift guard","Policy"],icon:Sparkles,domain:"Learning",state:"queued" },
];
const domains: Domain[] = ["Orchestration","Intelligence","Decision","Execution","Learning"];

export function AiAgentInitializationPage() {
  const [agents,setAgents]=useState(definitions); const [cycle,setCycle]=useState(0); const [retryIn,setRetryIn]=useState(90); const [active,setActive]=useState(false);
  const timers=useRef<number[]>([]); const retryRef=useRef(90);
  const run=useCallback(()=>{ timers.current.forEach(window.clearTimeout); timers.current=[]; retryRef.current=90; setRetryIn(90); setCycle(v=>v+1); setActive(true); setAgents(definitions.map(a=>({...a,state:"queued"})));
    definitions.forEach((agent,index)=>{ const start=window.setTimeout(()=>setAgents(current=>current.map(a=>a.id===agent.id?{...a,state:"registering"}:a)),index*105); const finish=window.setTimeout(()=>{setAgents(current=>current.map(a=>a.id===agent.id?{...a,state:"blocked"}:a)); if(index===definitions.length-1)setActive(false)},index*105+520); timers.current.push(start,finish) });
  },[]);
  useEffect(()=>{run();const interval=window.setInterval(()=>{const next=retryRef.current-1;if(next<=0)run();else{retryRef.current=next;setRetryIn(next)}},1000);return()=>{window.clearInterval(interval);timers.current.forEach(window.clearTimeout)}},[run]);
  const counts=useMemo(()=>({ready:agents.filter(a=>a.state==="ready").length,blocked:agents.filter(a=>a.state==="blocked").length,registering:agents.filter(a=>a.state==="registering").length,queued:agents.filter(a=>a.state==="queued").length}),[agents]);
  const progress=Math.round(((counts.ready+counts.blocked)/agents.length)*100); const ready=agents.every(a=>a.state==="ready");

  return <main className={styles.page}>
    <nav className={styles.breadcrumb}><a href="/platform-readiness">Platform Readiness</a><ChevronRight size={13}/><a href="/platform-readiness/initialize">Initialize</a><ChevronRight size={13}/><strong>AI Agent Initialization</strong></nav>
    <section className={styles.commandBand}>
      <div className={styles.identity}><div className={styles.brain}><BrainCircuit size={30}/><i/></div><div><span>CONTROL GROUP 03 · AUTONOMOUS AGENT FABRIC</span><h1>AI Agent Initialization</h1><p>Registering bounded identities, mandates, tools, policies, and memory scopes.</p></div></div>
      <div className={styles.commandStats}><div><small>Registry cycle</small><strong>#{cycle}</strong></div><div><small>Agents online</small><strong>{counts.ready}<em>/{agents.length}</em></strong></div><div><small>Assessment</small><strong>{progress}%</strong></div></div>
      <div className={`${styles.decision} ${ready?styles.ready:""}`}><small>FABRIC DECISION</small><strong>{ready?<CheckCircle2 size={15}/>:<LockKeyhole size={15}/>} {ready?"READY":active?"REGISTERING":"IDENTITIES HELD"}</strong><span>{active?`${counts.registering} identity bindings active`:`Autonomous retry in ${retryIn}s`}</span></div>
    </section>

    <section className={styles.policyStrip}>
      <div><Fingerprint size={17}/><span><strong>Signed identity</strong><small>One principal per agent</small></span></div><div><KeyRound size={17}/><span><strong>Least authority</strong><small>Explicit tool allowlists</small></span></div><div><Database size={17}/><span><strong>Bounded memory</strong><small>Scoped read and write</small></span></div><div><ShieldCheck size={17}/><span><strong>No self-expansion</strong><small>Live policy is immutable</small></span></div><div className={styles.live}><RefreshCw className={active?styles.spin:""} size={15}/>{active?"Registry scanning":"Continuously monitored"}</div>
    </section>

    <div className={styles.workspace}>
      <section className={styles.fabric}>
        <header><div><h2>Authority & Agent Fabric</h2><p>Agents are grouped by operational mandate—not startup order—and remain isolated by authority.</p></div><span><i/> Live registry</span></header>
        <div className={styles.domainGrid}>{domains.map(domain=><section className={`${styles.domain} ${styles[`domain${domain}`]}`} key={domain}>
          <div className={styles.domainHead}><span>{domain}</span><b>{agents.filter(a=>a.domain===domain).length} AGENT{agents.filter(a=>a.domain===domain).length>1?"S":""}</b></div>
          <div className={styles.agentGrid}>{agents.filter(a=>a.domain===domain).map(agent=>{const Icon=agent.icon;return <article className={`${styles.agentCard} ${styles[agent.state]}`} key={agent.id}>
            <div className={styles.agentTop}><span className={styles.avatar}><Icon size={18}/><b>{agent.short}</b></span><span className={styles.agentState}>{stateIcon(agent.state)}{agent.state==="registering"?"Registering":agent.state==="blocked"?"Unbound":agent.state}</span></div>
            <h3>{agent.name}</h3><p>{agent.role}</p><div className={styles.authority}><small>AUTHORITY</small><strong>{agent.authority}</strong></div><div className={styles.bindings}>{agent.bindings.map(binding=><span key={binding}>{binding}</span>)}</div>
          </article>})}</div>
        </section>)}</div>
      </section>

      <aside className={styles.sidePanel}>
        <div className={styles.ringCard}><div className={styles.ring} style={{"--progress":`${progress*3.6}deg`} as React.CSSProperties}><div><strong>{progress}%</strong><small>ASSESSED</small></div></div><ul><li><i className={styles.greenDot}/>Registered <b>{counts.ready}</b></li><li><i className={styles.blueDot}/>Registering <b>{counts.registering}</b></li><li><i className={styles.grayDot}/>Queued <b>{counts.queued}</b></li><li><i className={styles.redDot}/>Blocked <b>{counts.blocked}</b></li></ul></div>
        <div className={styles.guardrail}><AlertTriangle size={17}/><div><strong>Fail-closed guardrail</strong><p>Missing workload identities cannot be replaced by mock agents or inherited service credentials.</p></div></div>
        <div className={styles.audit}><h3>Registry Evidence</h3><div><i/><span>Manifest resolved</span><time>Automatic</time></div><div><i/><span>Authority collisions checked</span><time>Automatic</time></div><div><i/><span>Tool scopes evaluated</span><time>Automatic</time></div><div><i/><span>{active?"Identity proofs being tested":"HOLD decision published"}</span><time>Live</time></div><p><FileClock size={14}/>Every registration attempt is immutable and traceable.</p></div>
      </aside>
    </div>
  </main>
}

function stateIcon(state:AgentState){if(state==="ready")return <CheckCircle2 size={12}/>;if(state==="registering")return <RefreshCw className={styles.spin} size={12}/>;if(state==="blocked")return <XCircle size={12}/>;return <Circle size={12}/>}
