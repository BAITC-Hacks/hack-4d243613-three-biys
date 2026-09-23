import { HeroPulse, BridgeBuild, RadarScan, StepDraft, StepQuestions, StepCard, StepRating, StepPublish, LevelDraft, LevelWorking, LevelReady, LevelPriority, EmptyCatalog, EmptyProposals, EmptyTasks, AiThinking, PublishedStamp, LevelUpBurst, PrivacyShield, CollectorLaptop, MilestoneFlag, ErrorBridge, TeamAvatar, BusinessAvatar, GridBackground } from "./index";
import { ink, lime, paper, white, type IllustrationProps } from "./shared";
const examples = [
  { name: "HeroPulse", Component: HeroPulse },
  { name: "BridgeBuild", Component: BridgeBuild },
  { name: "RadarScan", Component: RadarScan },
  { name: "StepDraft", Component: StepDraft },
  { name: "StepQuestions", Component: StepQuestions },
  { name: "StepCard", Component: StepCard },
  { name: "StepRating", Component: StepRating },
  { name: "StepPublish", Component: StepPublish },
  { name: "LevelDraft", Component: LevelDraft },
  { name: "LevelWorking", Component: LevelWorking },
  { name: "LevelReady", Component: LevelReady },
  { name: "LevelPriority", Component: LevelPriority },
  { name: "EmptyCatalog", Component: EmptyCatalog },
  { name: "EmptyProposals", Component: EmptyProposals },
  { name: "EmptyTasks", Component: EmptyTasks },
  { name: "AiThinking", Component: AiThinking },
  { name: "PublishedStamp", Component: PublishedStamp },
  { name: "LevelUpBurst", Component: LevelUpBurst },
  { name: "PrivacyShield", Component: PrivacyShield },
  { name: "CollectorLaptop", Component: CollectorLaptop },
  { name: "MilestoneFlag", Component: MilestoneFlag },
  { name: "ErrorBridge", Component: ErrorBridge },
  { name: "GridBackground", Component: GridBackground },
];
const tile = { border: `2px solid ${ink}`, padding: 16, background: white };
export function Gallery({className, size, animated = true, title = "Көпір illustrations"}: IllustrationProps) {
  return <section className={className} aria-label={title} style={{padding:24,background:paper,color:ink,fontFamily:"var(--font-sans,sans-serif)"}}>
    <h2 style={{fontWeight:800,fontSize:28,margin:"0 0 8px"}}>{title}</h2>
    <p>Слева — анимация. Справа — статичный вариант. При снижении движения в системе оба неподвижны.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,290px),1fr))",gap:16}}>
      {examples.map(({name,Component})=><article key={name} style={tile}>
        <h3 style={{fontSize:14,margin:"0 0 20px",borderBottom:`4px solid ${lime}`,paddingBottom:8}}>{name}</h3>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-around",gap:12,minHeight:128}}>
          <Component size={size ?? (name.startsWith("Step") ? 40 : /^Level(Draft|Working|Ready|Priority)$/.test(name) ? 24 : 120)} animated={animated} title={name}/>
          <Component size={size ?? (name.startsWith("Step") ? 40 : /^Level(Draft|Working|Ready|Priority)$/.test(name) ? 24 : 120)} animated={false} title={`${name}: статичный`}/>
        </div>
      </article>)}
      <article style={tile}><h3>TeamAvatar</h3><div style={{display:"flex",gap:16}}>{["Three Biys","Көпір","Three Biys"].map((name,i)=><TeamAvatar key={i} name={name} title={name} size={64} animated={animated}/>)}</div><p>Одинаковое название → одинаковый узор.</p></article>
      <article style={tile}><h3>BusinessAvatar</h3><div style={{display:"flex",gap:16}}>{["Әлем","Көпір","Бизнес"].map(name=><BusinessAvatar key={name} name={name} title={name} size={64} animated={animated}/>)}</div></article>
    </div>
  </section>;
}
