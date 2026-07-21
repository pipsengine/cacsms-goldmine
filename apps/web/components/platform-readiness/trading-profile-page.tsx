"use client";

import { Bell, CheckCircle2, ChevronRight, CircleGauge, Info, LayoutDashboard, PauseCircle, RadioTower, RefreshCw, RotateCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectivityDebugResponse, ConnectivitySnapshot, ConnectivitySnapshotResponse } from "@/types/connectivity";
import type { LifecycleControlResponse, LifecycleRuntime } from "@/types/lifecycle-control";
import type { StartInitializeHandoff, StartInitializeHandoffResponse } from "@/types/platform-readiness-handoff";
import styles from "./trading-profile-page.module.css";

const REFRESH_INTERVAL_MS = 5000;
type StreamMode = "connecting" | "live" | "polling";
type Tone = "purple" | "green" | "orange" | "red";
type StatusRow = { title: string; value: string; tone: Tone; detail: string; icon: typeof RadioTower };

export function TradingProfilePage() {
  const [runtime,setRuntime]=useState<LifecycleRuntime|null>(null);
  const [connectivity,setConnectivity]=useState<ConnectivitySnapshot|null>(null);
  const [debug,setDebug]=useState<ConnectivityDebugResponse|null>(null);
  const [handoff,setHandoff]=useState<StartInitializeHandoff|null>(null);
  const [streamMode,setStreamMode]=useState<StreamMode>("connecting");
  const [lastReceivedAt,setLastReceivedAt]=useState<string|null>(null);
  const [lastError,setLastError]=useState<string|null>(null);
  const [refreshing,setRefreshing]=useState(false);
  const refreshPending=useRef(false);
  const mounted=useRef(true);

  const refreshAll=useCallback(async()=>{
    if(refreshPending.current)return;
    refreshPending.current=true;
    if(mounted.current)setRefreshing(true);
    try{
      const [runtimeResponse,connectivityResponse,debugResponse,handoffResponse]=await Promise.all([
        fetch("/api/lifecycle-control",{cache:"no-store",headers:{Accept:"application/json"}}),
        fetch("/api/platform-readiness/connect",{cache:"no-store",headers:{Accept:"application/json"}}),
        fetch("/api/platform-readiness/connect/debug",{cache:"no-store",headers:{Accept:"application/json"}}),
        fetch("/api/platform-readiness/handoff/start-initialize",{cache:"no-store",headers:{Accept:"application/json"}}),
      ]);
      if(!runtimeResponse.ok)throw new Error(`Lifecycle state failed with ${runtimeResponse.status}`);
      if(!connectivityResponse.ok)throw new Error(`Connectivity state failed with ${connectivityResponse.status}`);
      if(!debugResponse.ok)throw new Error(`MT5 profile evidence failed with ${debugResponse.status}`);
      if(!handoffResponse.ok)throw new Error(`START handoff failed with ${handoffResponse.status}`);
      const runtimePayload=await runtimeResponse.json() as LifecycleControlResponse;
      const connectivityPayload=await connectivityResponse.json() as ConnectivitySnapshotResponse;
      const debugPayload=await debugResponse.json() as ConnectivityDebugResponse;
      const handoffPayload=await handoffResponse.json() as StartInitializeHandoffResponse;
      if(!mounted.current)return;
      setRuntime(runtimePayload.runtime);setConnectivity(connectivityPayload.snapshot);setDebug(debugPayload);setHandoff(handoffPayload.handoff);setLastReceivedAt(new Date().toISOString());setLastError(null);
    }catch(error){if(mounted.current)setLastError(error instanceof Error?error.message:"Trading profile refresh failed");}
    finally{refreshPending.current=false;if(mounted.current)setRefreshing(false);}
  },[]);

  useEffect(()=>{
    mounted.current=true;
    const lifecycleStream=new EventSource("/api/executive/lifecycle-command-centre/stream");
    const connectivityStream=new EventSource("/api/platform-readiness/connect/stream");
    const pollTimer=window.setInterval(()=>void refreshAll(),REFRESH_INTERVAL_MS);
    const onRuntimeUpdate=()=>void refreshAll();
    lifecycleStream.addEventListener("open",()=>setStreamMode("live"));
    lifecycleStream.addEventListener("message",onRuntimeUpdate);
    lifecycleStream.addEventListener("error",()=>setStreamMode("polling"));
    connectivityStream.addEventListener("open",()=>setStreamMode("live"));
    connectivityStream.addEventListener("snapshot",event=>{try{setConnectivity(JSON.parse((event as MessageEvent).data) as ConnectivitySnapshot);setLastReceivedAt(new Date().toISOString());setLastError(null);setStreamMode("live");}catch{setLastError("A realtime trading-profile event could not be decoded.");}});
    connectivityStream.addEventListener("error",()=>setStreamMode("polling"));
    window.addEventListener("lifecycle-runtime-updated",onRuntimeUpdate);
    void refreshAll();
    return()=>{mounted.current=false;lifecycleStream.close();connectivityStream.close();window.clearInterval(pollTimer);window.removeEventListener("lifecycle-runtime-updated",onRuntimeUpdate);};
  },[refreshAll]);

  const mt5=debug?.mt5;
  const handoffCurrent=Boolean(handoff&&Date.parse(handoff.expiresAt)>Date.now());
  const profileCheck=handoff?.inputs.checklist.checks.find(check=>check.id==="trading-profile");
  const profileVerified=connectivity?.broker.status==="online"&&connectivity.marketData.status==="online"&&Boolean(mt5?.symbolSelected)&&mt5?.symbol==="XAUUSD";
  const blocked=connectivity?.broker.status==="offline"||Boolean(mt5?.error);
  const decision=profileVerified?{label:"Ready",tone:"green" as Tone,detail:`Trading profile verified; overall START handoff is ${handoff?.decision??"awaiting assessment"}.`}:blocked?{label:"Block",tone:"red" as Tone,detail:mt5?.error??"Broker or market profile evidence is offline."}:{label:"Hold",tone:"orange" as Tone,detail:handoffCurrent?"Trading profile evidence is incomplete.":"Waiting for a current pre-start assessment handoff."};
  const alertCount=(connectivity?.alerts.length??0)+(profileVerified?0:1);
  const rows:StatusRow[]=[
    {title:"Status",value:profileVerified?"Verified":blocked?"Blocked":"Pending",tone:profileVerified?"green":blocked?"red":"purple",detail:profileVerified?`${mt5?.symbol??"XAUUSD"} is selected with live broker quotes.`:profileCheck?`Latest production check: ${profileCheck.status}.`:"Awaiting production trading-profile evidence.",icon:RadioTower},
    {title:"KPI Live",value:connectivity?.marketData.status==="online"?"Live":"Pending",tone:connectivity?.marketData.status==="online"?"green":"orange",detail:connectivity?`${connectivity.marketData.symbol} ${formatPrice(connectivity.marketData.bid)} / ${formatPrice(connectivity.marketData.ask)} · ${connectivity.marketData.ticksPerMinute} ticks/min.`:"Loading market data.",icon:CircleGauge},
    {title:"Decision",value:decision.label,tone:decision.tone,detail:decision.detail,icon:PauseCircle},
    {title:"Alerts",value:String(alertCount),tone:alertCount===0?"green":"red",detail:alertCount===0?"No active trading-profile or connectivity alerts.":`${alertCount} active profile and connectivity alert${alertCount===1?"":"s"}.`,icon:Bell},
  ];

  return <main className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><span>Platform Readiness</span><ChevronRight size={13}/><span>Start</span><ChevronRight size={13}/><strong>Trading Profile</strong></nav>
    <header className={styles.pageHeader}><p className={styles.eyebrow}>Lifecycle configuration</p><h1>Trading Profile</h1><div className={styles.metadata}><span className={styles.primaryTag}>START</span><span>Platform Readiness</span><span>System state: {runtime?titleCase(runtime.status):"Connecting"}</span><span>Realtime: {streamMode}</span><span>Last update: {formatTime(lastReceivedAt)}</span><span>Audit: audit.platform-readiness.start.trading-profile</span></div></header>
    {lastError?<div className={styles.emptyState} role="alert"><span><Info size={12}/></span><p>{lastError}</p></div>:null}
    <section className={styles.statusList} aria-label="Trading profile status" aria-live="polite">{rows.map(({icon:Icon,...row})=><article className={styles.statusRow} key={row.title}><span className={`${styles.statusIcon} ${styles[row.tone]}`}><Icon size={22}/></span><div className={styles.statusIdentity}><span>{row.title}</span><strong className={styles[`${row.tone}Text`]}>{row.value}</strong></div><p>{row.detail}</p><button type="button" onClick={()=>void refreshAll()} aria-label={`Refresh ${row.title}`}><ChevronRight size={18}/></button></article>)}</section>
    <section className={styles.workspace}><header><span><LayoutDashboard size={20}/></span><div><h2>Primary Workspace</h2><p>Live trading profile data, decision evidence, and service bindings</p></div></header><div className={styles.workspaceBody}><dl>
      <div><dt>Active symbol</dt><dd><strong>{mt5?.symbol??connectivity?.marketData.symbol??"XAUUSD"}</strong> · {mt5?.symbolSelected?"Selected":"Pending selection"}</dd></div>
      <div><dt>Operating mode</dt><dd>{titleCase(connectivity?.broker.tradeMode??"unconfigured")}</dd></div>
      <div><dt>Broker binding</dt><dd>{connectivity?`${connectivity.broker.brokerName} · ${connectivity.broker.account} · ${connectivity.broker.server}`:"Loading broker evidence"}</dd></div>
      <div><dt>Live quote</dt><dd>{connectivity?`${formatPrice(connectivity.marketData.bid)} / ${formatPrice(connectivity.marketData.ask)} · spread ${formatPrice(connectivity.marketData.spread)}`:"Loading quote"}</dd></div>
      <div><dt>Tick activity</dt><dd>{connectivity?`${connectivity.marketData.ticksPerMinute} ticks/min · ${formatTime(connectivity.marketData.lastTickAt)}`:"Loading tick evidence"}</dd></div>
      <div><dt>Session policy</dt><dd>{handoff?.inputs.tradingProfile.sessionPolicy??"Awaiting verified START profile"}</dd></div>
      <div><dt>Strategy policy</dt><dd>{handoff?.inputs.tradingProfile.strategyPolicy??"Awaiting approved registry"}</dd></div>
      <div><dt>START handoff</dt><dd>{handoff?`${handoff.decision} · ${handoffCurrent?"current":"expired"}`:"Not published"}</dd></div>
      <div><dt>Decision evidence</dt><dd>{runtime?.reason??"Awaiting lifecycle evidence."}</dd></div>
      <div><dt>Permission</dt><dd><strong>platform-readiness.start.trading-profile.view</strong></dd></div>
    </dl></div></section>
    <section className={styles.actions}><h2>Actions</h2><div className={styles.actionButtons}><button type="button" onClick={()=>void refreshAll()} disabled={refreshing}><RotateCw size={15}/>{refreshing?"Refreshing":"Retry"}</button><button type="button" onClick={()=>void refreshAll()} disabled={refreshing}><RefreshCw size={15}/>Sync</button><button type="button" onClick={()=>setLastError(null)}><CheckCircle2 size={15}/>Acknowledge</button></div><div className={styles.emptyState}><span><Info size={12}/></span><p>{lastReceivedAt?`Live production profile evidence received at ${formatTime(lastReceivedAt)} via ${streamMode==="live"?"realtime streams":"polling fallback"}.`:"Connecting to production profile sources."}</p></div></section>
  </main>;
}

function titleCase(value:string){return value.replace(/-/g," ").replace(/\b\w/g,letter=>letter.toUpperCase());}
function formatPrice(value:number|null|undefined){return typeof value==="number"?value.toFixed(2):"n/a";}
function formatTime(value:string|null){return value?new Intl.DateTimeFormat(undefined,{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(value)):"Connecting";}
