"use client";

import { Activity, AlertTriangle, Bot, BrainCircuit, ChevronRight, CircleCheck, Clock3, Landmark, LockKeyhole, Radar, Scale, ShieldCheck, Sparkles, TrendingDown, Waves, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectivityDebugResponse, ConnectivitySnapshot, ConnectivitySnapshotResponse } from "@/types/connectivity";
import type { LifecycleControlResponse, LifecycleRuntime } from "@/types/lifecycle-control";
import type { StartCheckStatus, StartInitializeHandoff, StartInitializeHandoffResponse } from "@/types/platform-readiness-handoff";
import styles from "./risk-profile-page.module.css";

const REFRESH_INTERVAL_MS = 5000;
const limits = [
  {label:"Risk / trade",value:"0.50%",cap:"0.75% hard cap",position:67,tone:"violet"},
  {label:"Basket exposure",value:"1.50%",cap:"2.00% hard cap",position:75,tone:"blue"},
  {label:"Daily loss",value:"2.00%",cap:"Stop threshold",position:25,tone:"amber"},
  {label:"Weekly loss",value:"4.00%",cap:"Stop threshold",position:18,tone:"orange"},
  {label:"Max drawdown",value:"8.00%",cap:"Terminal boundary",position:10,tone:"red"},
] as const;
const steps = [["01","OBSERVE","Account, market, session, and news state"],["02","CALCULATE","Safe budget and adaptive multipliers"],["03","CHALLENGE","Independent authority validates boundaries"],["04","ENFORCE","Immutable limits published downstream"]] as const;
type StreamMode = "connecting" | "live" | "polling";

export function RiskProfilePage() {
  const [runtime,setRuntime] = useState<LifecycleRuntime|null>(null);
  const [connectivity,setConnectivity] = useState<ConnectivitySnapshot|null>(null);
  const [debug,setDebug] = useState<ConnectivityDebugResponse|null>(null);
  const [handoff,setHandoff] = useState<StartInitializeHandoff|null>(null);
  const [streamMode,setStreamMode] = useState<StreamMode>("connecting");
  const [lastReceivedAt,setLastReceivedAt] = useState<string|null>(null);
  const [lastError,setLastError] = useState<string|null>(null);
  const refreshPending = useRef(false);
  const mounted = useRef(true);

  const refreshAll = useCallback(async()=>{
    if(refreshPending.current)return;
    refreshPending.current=true;
    try{
      const [runtimeResponse,connectivityResponse,debugResponse,handoffResponse]=await Promise.all([
        fetch("/api/lifecycle-control",{cache:"no-store",headers:{Accept:"application/json"}}),
        fetch("/api/platform-readiness/connect",{cache:"no-store",headers:{Accept:"application/json"}}),
        fetch("/api/platform-readiness/connect/debug",{cache:"no-store",headers:{Accept:"application/json"}}),
        fetch("/api/platform-readiness/handoff/start-initialize",{cache:"no-store",headers:{Accept:"application/json"}}),
      ]);
      if(!runtimeResponse.ok)throw new Error(`Lifecycle state failed with ${runtimeResponse.status}`);
      if(!connectivityResponse.ok)throw new Error(`Connectivity state failed with ${connectivityResponse.status}`);
      if(!debugResponse.ok)throw new Error(`MT5 risk evidence failed with ${debugResponse.status}`);
      if(!handoffResponse.ok)throw new Error(`START handoff failed with ${handoffResponse.status}`);
      const runtimePayload=await runtimeResponse.json() as LifecycleControlResponse;
      const connectivityPayload=await connectivityResponse.json() as ConnectivitySnapshotResponse;
      const debugPayload=await debugResponse.json() as ConnectivityDebugResponse;
      const handoffPayload=await handoffResponse.json() as StartInitializeHandoffResponse;
      if(!mounted.current)return;
      setRuntime(runtimePayload.runtime);setConnectivity(connectivityPayload.snapshot);setDebug(debugPayload);setHandoff(handoffPayload.handoff);setLastReceivedAt(new Date().toISOString());setLastError(null);
    }catch(error){if(mounted.current)setLastError(error instanceof Error?error.message:"Risk profile refresh failed");}
    finally{refreshPending.current=false;}
  },[]);

  useEffect(()=>{
    mounted.current=true;
    const lifecycleStream=new EventSource("/api/executive/lifecycle-command-centre/stream");
    const connectivityStream=new EventSource("/api/platform-readiness/connect/stream");
    const pollTimer=window.setInterval(()=>void refreshAll(),REFRESH_INTERVAL_MS);
    const onRuntimeUpdate=()=>void refreshAll();
    lifecycleStream.addEventListener("open",()=>setStreamMode("live"));
    lifecycleStream.addEventListener("message",()=>void refreshAll());
    lifecycleStream.addEventListener("error",()=>setStreamMode("polling"));
    connectivityStream.addEventListener("open",()=>setStreamMode("live"));
    connectivityStream.addEventListener("snapshot",event=>{try{setConnectivity(JSON.parse((event as MessageEvent).data) as ConnectivitySnapshot);setLastReceivedAt(new Date().toISOString());setLastError(null);setStreamMode("live");}catch{setLastError("A realtime risk event could not be decoded.");}});
    connectivityStream.addEventListener("error",()=>setStreamMode("polling"));
    window.addEventListener("lifecycle-runtime-updated",onRuntimeUpdate);
    void refreshAll();
    return()=>{mounted.current=false;lifecycleStream.close();connectivityStream.close();window.clearInterval(pollTimer);window.removeEventListener("lifecycle-runtime-updated",onRuntimeUpdate);};
  },[refreshAll]);

  const mt5=debug?.mt5;
  const brokerOnline=connectivity?.broker.status==="online"&&Boolean(mt5?.accountConnected);
  const marketOnline=connectivity?.marketData.status==="online";
  const newsService=connectivity?.services.find(service=>service.id==="news-calendar");
  const riskState=handoff?.inputs.riskProfile.state??"unavailable";
  const effectiveMultiplier=handoff?.inputs.riskProfile.effectiveMultiplier??"0.00x";
  const ready=riskState==="verified"&&brokerOnline&&marketOnline&&handoff?.decision==="AUTHORIZED";
  const verdict=ready?"READY":mt5?.error||runtime?.status==="error"?"BLOCK":"HOLD";
  const verdictDetail=ready?"Production risk evidence verified":handoff?.evidence.reasons[0]??mt5?.error??"Awaiting START risk assessment evidence";
  const riskCheck=checkStatus(handoff,"risk-profile");
  const accountCheck=checkStatus(handoff,"account");
  const emergencyCheck=checkStatus(handoff,"emergency");
  const controllers=[
    {title:"Volatility Scaler",description:"Tightens position risk as realized volatility and ATR expand.",state:marketOnline?"MONITORING":"MARKET PENDING",icon:Waves,tone:marketOnline?"violet":"amber"},
    {title:"News Risk Reducer",description:"Applies blackout windows around high-impact USD events.",state:newsService?.status==="online"?"MONITORING":"CALENDAR PENDING",icon:Radar,tone:newsService?.status==="online"?"green":"amber"},
    {title:"Loss-Streak Throttle",description:"Reduces frequency and size after consecutive losses.",state:brokerOnline?"ARMED":"ACCOUNT PENDING",icon:TrendingDown,tone:brokerOnline?"green":"amber"},
    {title:"Exposure Controller",description:"Rejects correlated baskets and directional concentration.",state:mt5?.permissions.includes("positions")?"MONITORING":"POSITIONS PENDING",icon:Scale,tone:mt5?.permissions.includes("positions")?"blue":"amber"},
  ];
  const inputs=[
    {icon:Landmark,label:"Account & margin",state:brokerOnline&&mt5?.equity!==null?"VERIFIED":statusLabel(accountCheck)},
    {icon:Waves,label:"Volatility regime",state:marketOnline?"LIVE":"PENDING"},
    {icon:Radar,label:"News restrictions",state:newsService?.status==="online"?"LIVE":"PENDING"},
    {icon:Activity,label:"Open exposure",state:typeof mt5?.positionsTotal==="number"?`${mt5.positionsTotal} OPEN`:"PENDING"},
    {icon:Zap,label:"Emergency controls",state:statusLabel(emergencyCheck)},
  ];

  return <main className={styles.page}>
    <nav className={styles.breadcrumb}><a href="/platform-readiness">Platform Readiness</a><ChevronRight size={13}/><a href="/platform-readiness/start">Start</a><ChevronRight size={13}/><strong>Risk Profile</strong></nav>
    {lastError?<div className={styles.liveError} role="alert"><AlertTriangle size={15}/><span>{lastError}</span></div>:null}
    <section className={styles.cockpit} aria-live="polite">
      <div className={styles.cockpitTitle}><span className={styles.shield}><ShieldCheck size={29}/><i/></span><div><small>START · AUTONOMOUS RISK GOVERNANCE</small><h1>Risk Profile</h1><p>A dynamic safety envelope independently enforced across every trading decision.</p></div></div>
      <div className={styles.profile}><small>ACTIVE PROFILE</small><strong>{handoff?.inputs.riskProfile.profile.toUpperCase()??"CONSERVATIVE"}</strong><span>{connectivity?.broker.tradeMode?`${connectivity.broker.tradeMode.toUpperCase()} · ${connectivity.broker.account}`:"Loading account mode"}</span></div>
      <div className={styles.multiplier}><div><strong>{effectiveMultiplier.replace("x","")}<em>×</em></strong><small>EFFECTIVE RISK</small></div><span>{riskState==="verified"?"Production verified":"Locked until validated"}</span></div>
      <div className={`${styles.verdict} ${ready?styles.verdictReady:""}`}><small>RISK AUTHORITY VERDICT</small><strong>{ready?<CircleCheck size={15}/>:<LockKeyhole size={15}/>} {verdict}</strong><span>{verdictDetail}</span></div>
    </section>

    <section className={styles.envelope}>
      <header><div><Scale size={20}/><span><h2>Risk Exposure Envelope</h2><p>Hard boundaries distributed to decision, execution, and position supervision.</p></span></div><b><i/>{streamMode==="live"?"CONTINUOUSLY EVALUATED":"POLLING SAFETY NET"}</b></header>
      <div className={styles.gaugeGrid}>{limits.map(limit=><article className={styles.gaugeCard} key={limit.label}><div className={styles.gaugeTop}><span>{limit.label}</span><b>{limit.value}</b></div><div className={styles.verticalGauge}><i className={styles[limit.tone]} style={{height:`${limit.position}%`}}/><span className={styles.marker} style={{bottom:`${limit.position}%`}}/></div><div className={styles.scaleLabels}><span>BOUNDARY</span><span>SAFE</span></div><small>{limit.cap}</small><strong><CircleCheck size={11}/> POLICY ENFORCED</strong></article>)}</div>
      <div className={`${styles.zeroLock} ${ready?styles.riskReady:""}`}><AlertTriangle size={17}/><div><strong>{ready?"Production risk envelope verified":"Zero-risk startup lock"}</strong><p>{ready?`Account equity ${formatMoney(mt5?.equity,mt5?.currency)}, broker rules, market feed, and START evidence are verified.`:`Configured limits remain visible, but effective risk is ${effectiveMultiplier} until account, market, handoff, and emergency evidence are verified.`}</p></div><span>{ready?"READY":"FAIL CLOSED"}</span></div>
    </section>

    <div className={styles.controlGrid}>
      <section className={styles.controllers}><header><Sparkles size={19}/><div><h2>Adaptive Control Matrix</h2><p>Controllers may only tighten the active profile; none can expand a hard boundary.</p></div></header><div className={styles.controllerGrid}>{controllers.map(({icon:Icon,...controller})=><article className={styles.controller} key={controller.title}><span className={`${styles.controllerIcon} ${styles[controller.tone]}`}><Icon size={20}/></span><div><h3>{controller.title}</h3><p>{controller.description}</p></div><b><i/>{controller.state}</b></article>)}</div></section>
      <aside className={styles.authority}><header><div className={styles.ai}><BrainCircuit size={25}/></div><span><small>INDEPENDENT AUTHORITY</small><h2>Risk Officer AI</h2><p>Final, non-bypassable risk veto</p></span><i/></header><div className={`${styles.authorityStatus} ${ready?styles.authorityReady:""}`}><span>{ready?<CircleCheck size={15}/>:<LockKeyhole size={15}/>}CURRENT DECISION</span><b>{verdict}</b></div><div className={styles.inputList}>{inputs.map(({icon:Icon,label,state})=><div key={label}><Icon size={14}/><span>{label}</span><b>{state}</b></div>)}</div><dl><div><dt>Assessment</dt><dd>{streamMode.toUpperCase()}</dd></div><div><dt>Effective risk</dt><dd>{effectiveMultiplier}</dd></div><div><dt>Equity</dt><dd>{formatMoney(mt5?.equity,mt5?.currency)}</dd></div><div><dt>Risk check</dt><dd>{statusLabel(riskCheck)}</dd></div><div><dt>Unsafe override</dt><dd>PROHIBITED</dd></div></dl></aside>
    </div>

    <section className={styles.decisionStrip}><div className={styles.stripTitle}><Bot size={18}/><span><h2>Autonomous Decision Circuit</h2><p>Observe to enforcement without manual intervention</p></span></div><div className={styles.steps}>{steps.map(([number,title,detail],index)=><div className={styles.step} key={number}><b>{number}</b><span><strong>{title}</strong><small>{detail}</small></span>{index<steps.length-1?<ChevronRight size={15}/>:<CircleCheck size={15}/>}</div>)}</div><div className={styles.audit}><Clock3 size={14}/><span>Updated {formatTime(lastReceivedAt)} · {handoff?.correlationId??runtime?.correlationId??connectivity?.correlationId??"awaiting correlation"}</span></div></section>
  </main>;
}

function checkStatus(handoff:StartInitializeHandoff|null,id:string):StartCheckStatus|null{return handoff?.inputs.checklist.checks.find(check=>check.id===id)?.status??null;}
function statusLabel(status:StartCheckStatus|null){return status?status.toUpperCase():"PENDING";}
function formatMoney(value:number|null|undefined,currency:string|null|undefined){return typeof value==="number"?`${value.toFixed(2)} ${currency??""}`.trim():"PENDING";}
function formatTime(value:string|null){return value?new Intl.DateTimeFormat(undefined,{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(value)):"connecting";}
