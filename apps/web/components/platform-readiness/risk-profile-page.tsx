import { Activity, AlertTriangle, Bot, BrainCircuit, ChevronRight, CircleCheck, Clock3, Landmark, LockKeyhole, Radar, Scale, ShieldCheck, Sparkles, TrendingDown, Waves, Zap } from "lucide-react";
import styles from "./risk-profile-page.module.css";

const limits=[
  {label:"Risk / trade",value:"0.50%",cap:"0.75% hard cap",position:67,tone:"violet"},
  {label:"Basket exposure",value:"1.50%",cap:"2.00% hard cap",position:75,tone:"blue"},
  {label:"Daily loss",value:"2.00%",cap:"Stop threshold",position:25,tone:"amber"},
  {label:"Weekly loss",value:"4.00%",cap:"Stop threshold",position:18,tone:"orange"},
  {label:"Max drawdown",value:"8.00%",cap:"Terminal boundary",position:10,tone:"red"},
] as const;
const controllers=[
  {title:"Volatility Scaler",description:"Tightens position risk as realized volatility and ATR expand.",state:"MONITORING",icon:Waves,tone:"violet"},
  {title:"News Risk Reducer",description:"Applies blackout windows around high-impact USD events.",state:"CALENDAR PENDING",icon:Radar,tone:"amber"},
  {title:"Loss-Streak Throttle",description:"Reduces frequency and size after consecutive losses.",state:"ARMED",icon:TrendingDown,tone:"green"},
  {title:"Exposure Controller",description:"Rejects correlated baskets and directional concentration.",state:"MONITORING",icon:Scale,tone:"blue"},
] as const;
const inputs=[[Landmark,"Account & margin","PENDING"],[Waves,"Volatility regime","PENDING"],[Radar,"News restrictions","PENDING"],[Activity,"Open exposure","PENDING"],[Zap,"Emergency controls","PENDING"]] as const;
const steps=[["01","OBSERVE","Account, market, session, and news state"],["02","CALCULATE","Safe budget and adaptive multipliers"],["03","CHALLENGE","Independent authority validates boundaries"],["04","ENFORCE","Immutable limits published downstream"]] as const;

export function RiskProfilePage(){return <main className={styles.page}>
  <nav className={styles.breadcrumb}><a href="/platform-readiness">Platform Readiness</a><ChevronRight size={13}/><a href="/platform-readiness/start">Start</a><ChevronRight size={13}/><strong>Risk Profile</strong></nav>

  <section className={styles.cockpit}>
    <div className={styles.cockpitTitle}><span className={styles.shield}><ShieldCheck size={29}/><i/></span><div><small>START · AUTONOMOUS RISK GOVERNANCE</small><h1>Risk Profile</h1><p>A dynamic safety envelope independently enforced across every trading decision.</p></div></div>
    <div className={styles.profile}><small>ACTIVE PROFILE</small><strong>CONSERVATIVE</strong><span>Baseline constitution v1.0</span></div>
    <div className={styles.multiplier}><div><strong>0.00<em>×</em></strong><small>EFFECTIVE RISK</small></div><span>Locked until validated</span></div>
    <div className={styles.verdict}><small>RISK AUTHORITY VERDICT</small><strong><LockKeyhole size={15}/> HOLD</strong><span>Awaiting production account state</span></div>
  </section>

  <section className={styles.envelope}>
    <header><div><Scale size={20}/><span><h2>Risk Exposure Envelope</h2><p>Hard boundaries distributed to decision, execution, and position supervision.</p></span></div><b><i/>CONTINUOUSLY EVALUATED</b></header>
    <div className={styles.gaugeGrid}>{limits.map(limit=><article className={styles.gaugeCard} key={limit.label}>
      <div className={styles.gaugeTop}><span>{limit.label}</span><b>{limit.value}</b></div>
      <div className={styles.verticalGauge}><i className={styles[limit.tone]} style={{height:`${limit.position}%`}}/><span className={styles.marker} style={{bottom:`${limit.position}%`}}/></div>
      <div className={styles.scaleLabels}><span>BOUNDARY</span><span>SAFE</span></div><small>{limit.cap}</small><strong><CircleCheck size={11}/> POLICY ENFORCED</strong>
    </article>)}</div>
    <div className={styles.zeroLock}><AlertTriangle size={17}/><div><strong>Zero-risk startup lock</strong><p>The configured envelope is visible, but effective risk remains 0.00× until account equity, broker rules, market conditions, and emergency protection are verified.</p></div><span>FAIL CLOSED</span></div>
  </section>

  <div className={styles.controlGrid}>
    <section className={styles.controllers}>
      <header><Sparkles size={19}/><div><h2>Adaptive Control Matrix</h2><p>Controllers may only tighten the active profile; none can expand a hard boundary.</p></div></header>
      <div className={styles.controllerGrid}>{controllers.map(({icon:Icon,...controller})=><article className={styles.controller} key={controller.title}><span className={`${styles.controllerIcon} ${styles[controller.tone]}`}><Icon size={20}/></span><div><h3>{controller.title}</h3><p>{controller.description}</p></div><b><i/>{controller.state}</b></article>)}</div>
    </section>
    <aside className={styles.authority}>
      <header><div className={styles.ai}><BrainCircuit size={25}/></div><span><small>INDEPENDENT AUTHORITY</small><h2>Risk Officer AI</h2><p>Final, non-bypassable risk veto</p></span><i/></header>
      <div className={styles.authorityStatus}><span><LockKeyhole size={15}/>CURRENT DECISION</span><b>HOLD</b></div>
      <div className={styles.inputList}>{inputs.map(([Icon,label,state])=><div key={label}><Icon size={14}/><span>{label}</span><b>{state}</b></div>)}</div>
      <dl><div><dt>Assessment</dt><dd>CONTINUOUS</dd></div><div><dt>Effective risk</dt><dd>0.00%</dd></div><div><dt>Unsafe override</dt><dd>PROHIBITED</dd></div><div><dt>Human approval</dt><dd>NOT REQUIRED</dd></div></dl>
    </aside>
  </div>

  <section className={styles.decisionStrip}>
    <div className={styles.stripTitle}><Bot size={18}/><span><h2>Autonomous Decision Circuit</h2><p>Observe to enforcement without manual intervention</p></span></div>
    <div className={styles.steps}>{steps.map(([number,title,detail],index)=><div className={styles.step} key={number}><b>{number}</b><span><strong>{title}</strong><small>{detail}</small></span>{index<steps.length-1?<ChevronRight size={15}/>:<CircleCheck size={15}/>}</div>)}</div>
    <div className={styles.audit}><Clock3 size={14}/><span>Every input, calculation, veto, and profile change is versioned automatically.</span></div>
  </section>
</main>}
