import Link from 'next/link';
import type { ReactNode } from 'react';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, BarChart3, CalendarDays, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

const VERDE = '#07533f';
const VERDE_OSCURO = '#064332';
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CUOTA = 'pago cuota por partido';

type Params = { mes?: string; anio?: string };

type Punto = { etiqueta: string; valor: number };

function dinero(n: number) {
  return n.toLocaleString('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
}
function normalizar(s: string | null | undefined) {
  return (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
function fechaUTC(d: Date) { return d.toISOString().slice(0, 10); }
function inicioMesUTC(anio: number, mes: number) { return new Date(Date.UTC(anio, mes - 1, 1)); }
function finMesUTC(anio: number, mes: number) { return new Date(Date.UTC(anio, mes, 1)); }
function inicioMesLima(anio: number, mes: number) { return new Date(`${anio}-${String(mes).padStart(2,'0')}-01T00:00:00-05:00`); }
function finMesLima(anio: number, mes: number) { return new Date(mes === 12 ? `${anio+1}-01-01T00:00:00-05:00` : `${anio}-${String(mes+1).padStart(2,'0')}-01T00:00:00-05:00`); }
function Card({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return <section style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:22,boxShadow:'0 3px 10px rgba(15,23,42,.035)',minWidth:0}}><h2 style={{fontSize:19,color:VERDE,margin:'0 0 6px',fontWeight:800}}>{title}</h2>{note && <p style={{margin:'0 0 18px',fontSize:13,color:'#64748b'}}>{note}</p>}{children}</section>;
}
function BarCompare({ items, maxValue }: { items: {label:string; ingresos:number; egresos:number}[]; maxValue:number }) {
  if (!items.length) return <p style={{color:'#64748b'}}>No hay movimientos para mostrar.</p>;
  return <div style={{display:'grid',gap:16}}>{items.map((it)=><div key={it.label}><div style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:13,marginBottom:7}}><strong>{it.label}</strong><span style={{color:'#64748b'}}>{dinero(it.ingresos)} / {dinero(it.egresos)}</span></div><div style={{display:'grid',gap:5}}><div style={{height:12,background:'#e2e8f0',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${maxValue ? it.ingresos/maxValue*100 : 0}%`,background:'#16a34a',borderRadius:99}} /></div><div style={{height:12,background:'#e2e8f0',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${maxValue ? it.egresos/maxValue*100 : 0}%`,background:'#dc2626',borderRadius:99}} /></div></div></div>)}</div>;
}
function Donut({ pagado, pendiente }: { pagado:number; pendiente:number }) {
  const total = pagado + pendiente;
  const circ = 2 * Math.PI * 54;
  const porcentaje = total > 0 ? pagado / total : 0;
  return <div style={{display:'flex',alignItems:'center',gap:24,flexWrap:'wrap'}}><svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="Distribución entre cobrado y pendiente"><circle cx="70" cy="70" r="54" fill="none" stroke="#fee2e2" strokeWidth="20"/><circle cx="70" cy="70" r="54" fill="none" stroke="#16a34a" strokeWidth="20" strokeDasharray={`${circ*porcentaje} ${circ}`} transform="rotate(-90 70 70)"/><text x="70" y="66" textAnchor="middle" fontSize="17" fontWeight="700" fill="#0f172a">{total ? Math.round(porcentaje*100):0}%</text><text x="70" y="84" textAnchor="middle" fontSize="10" fill="#64748b">cobrado</text></svg><div style={{display:'grid',gap:13}}><div><span style={{display:'inline-block',width:10,height:10,borderRadius:3,background:'#16a34a',marginRight:8}}/>Cobrado <strong>{dinero(pagado)}</strong></div><div><span style={{display:'inline-block',width:10,height:10,borderRadius:3,background:'#dc2626',marginRight:8}}/>Pendiente <strong>{dinero(pendiente)}</strong></div><div style={{color:'#64748b',fontSize:13}}>Total por cobrar: {dinero(total)}</div></div></div>;
}

export default async function GraficosBalancePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const now = new Date();
  const mesN = Number(params.mes);
  const anioN = Number(params.anio);
  const mes = Number.isInteger(mesN) && mesN >= 1 && mesN <= 12 ? mesN : Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',month:'numeric'}).format(now));
  const anio = Number.isInteger(anioN) && anioN >= 2000 && anioN <= 2100 ? anioN : Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',year:'numeric'}).format(now));
  const desdeUTC = inicioMesUTC(anio, mes), hastaUTC = finMesUTC(anio, mes);
  const desdeLima = inicioMesLima(anio, mes), hastaLima = finMesLima(anio, mes);
  const desdeAnioUTC = new Date(Date.UTC(anio,0,1)), hastaAnioUTC = new Date(Date.UTC(anio+1,0,1));
  const desdeAnioLima = new Date(`${anio}-01-01T00:00:00-05:00`), hastaAnioLima = new Date(`${anio+1}-01-01T00:00:00-05:00`);

  const [pagosMes,pagosAnio,egresosMes,egresosAnio,asistenciasMes,cuotasAnio,tipoCuota] = await Promise.all([
    prisma.payment.findMany({where:{status:'APPROVED',paymentDate:{gte:desdeUTC,lt:hastaUTC}},include:{paymentType:{select:{description:true,amount:true}}}}),
    prisma.payment.findMany({where:{status:'APPROVED',paymentDate:{gte:desdeAnioUTC,lt:hastaAnioUTC}},select:{paymentDate:true,amount:true}}),
    prisma.egreso.findMany({where:{fecha:{gte:desdeLima,lt:hastaLima}},include:{tipoEgreso:{select:{descripcion:true}}}}),
    prisma.egreso.findMany({where:{fecha:{gte:desdeAnioLima,lt:hastaAnioLima}},select:{fecha:true,monto:true}}),
    prisma.asistencia.findMany({where:{asistio:true,fechaPichanga:{gte:desdeUTC,lt:hastaUTC}},select:{playerId:true,fechaPichanga:true,asistio:true}}),
    prisma.payment.findMany({where:{status:'APPROVED',pichangaDate:{gte:inicioMesUTC(anio,1),lt:finMesUTC(anio,12)}},select:{playerId:true,pichangaDate:true,paymentType:{select:{description:true}}}}),
    prisma.paymentType.findFirst({where:{description:{equals:'Pago cuota por partido',mode:'insensitive'}},select:{amount:true}}),
  ]);

  const ingresosMes = pagosMes.reduce((s,p)=>s+Number(p.amount ?? 0),0);
  const egresosTotalMes = egresosMes.reduce((s,e)=>s+Number(e.monto),0);
  const pagosPorPichanga = new Set<string>();
  for (const p of cuotasAnio as any[]) {
    if (normalizar(p.paymentType?.description) === CUOTA && p.pichangaDate) pagosPorPichanga.add(`${p.playerId}|${fechaUTC(p.pichangaDate)}`);
  }
  const asistenciasUnicas = new Map<string,{playerId:string;fecha:string}>();
  for (const a of asistenciasMes) { const f=fechaUTC(a.fechaPichanga); asistenciasUnicas.set(`${a.playerId}|${f}`,{playerId:a.playerId,fecha:f}); }
  const montoCuota = Number(tipoCuota?.amount ?? 0);
  let cobrado = 0, pendiente = 0;
  const pichangaTotales = new Map<string,{cobrado:number;pendiente:number}>();
  for (const a of asistenciasUnicas.values()) {
    const pagado = pagosPorPichanga.has(`${a.playerId}|${a.fecha}`);
    const item = pichangaTotales.get(a.fecha) ?? {cobrado:0,pendiente:0};
    if (pagado) { cobrado += montoCuota; item.cobrado += montoCuota; }
    else { pendiente += montoCuota; item.pendiente += montoCuota; }
    pichangaTotales.set(a.fecha,item);
  }
  const mesesAnio = MESES.map((nombre,i)=>{
    const inicio = new Date(Date.UTC(anio,i,1)), fin = new Date(Date.UTC(anio,i+1,1));
    const ingreso = pagosAnio.filter(p=>p.paymentDate>=inicio && p.paymentDate<fin).reduce((s,p)=>s+Number(p.amount??0),0);
    const egreso = egresosAnio.filter(e=>e.fecha>=new Date(`${anio}-${String(i+1).padStart(2,'0')}-01T00:00:00-05:00`) && e.fecha<new Date(i===11?`${anio+1}-01-01T00:00:00-05:00`:`${anio}-${String(i+2).padStart(2,'0')}-01T00:00:00-05:00`)).reduce((s,e)=>s+Number(e.monto),0);
    return {etiqueta:nombre.slice(0,3),ingreso,egreso};
  });
  const maxMensual = Math.max(1,...mesesAnio.flatMap(x=>[x.ingreso,x.egreso]));
  const distribucion = new Map<string,number>();
  for (const e of egresosMes) { const nombre=e.tipoEgreso?.descripcion ?? 'Sin concepto'; distribucion.set(nombre,(distribucion.get(nombre)??0)+Number(e.monto)); }
  const gastos = Array.from(distribucion.entries()).map(([etiqueta,valor])=>({etiqueta,valor})).sort((a,b)=>b.valor-a.valor);
  const maxGasto = Math.max(1,...gastos.map(x=>x.valor));
  const pichangas = Array.from(pichangaTotales.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([fecha,v])=>({fecha, ...v}));
  const maxPichanga = Math.max(1,...pichangas.flatMap(x=>[x.cobrado,x.pendiente]));
  const anios = Array.from({length:7},(_,i)=>anio-i);
  const formatoFecha = (s:string) => new Intl.DateTimeFormat('es-PE',{timeZone:'UTC',day:'2-digit',month:'2-digit'}).format(new Date(`${s}T00:00:00Z`));

  return <main style={{minHeight:'100vh',background:'#f3f8f5',padding:'28px 18px 48px',fontFamily:'Arial,Helvetica,sans-serif',color:'#1e293b'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
    <header style={{background:VERDE_OSCURO,color:'#fff',padding:'28px 30px',borderRadius:16,marginBottom:22}}><Link href="/balance" style={{display:'inline-flex',alignItems:'center',gap:8,color:'#d1fae5',textDecoration:'none',fontSize:14,marginBottom:18}}><ArrowLeft size={17}/> Volver al balance</Link><div style={{display:'flex',alignItems:'center',gap:14}}><BarChart3 size={34}/><div><h1 style={{margin:0,fontSize:30,fontWeight:800}}>Gráficos del balance</h1><p style={{margin:'8px 0 0',color:'#d1fae5'}}>Ingresos, egresos y cobros de Peloteros San Antonio FC.</p></div></div></header>
    <nav style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:22}}><Link href="/balance" style={{padding:'10px 16px',borderRadius:8,border:'1px solid #cbd5e1',background:'#fff',color:'#334155',fontWeight:700,textDecoration:'none'}}>Tabla de balance</Link><span style={{padding:'10px 16px',borderRadius:8,background:'#047857',color:'#fff',fontWeight:700}}>Gráficos</span></nav>
    <section style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:22,marginBottom:22}}><h2 style={{margin:'0 0 16px',fontSize:19,color:VERDE}}>Filtrar por mes y año</h2><form action="/balance/graficos" method="GET" style={{display:'flex',gap:14,flexWrap:'wrap',alignItems:'end'}}><label style={{display:'grid',gap:7,fontSize:13,fontWeight:700,color:'#475569'}}>Mes<select name="mes" defaultValue={String(mes)} style={{height:44,minWidth:170,padding:'8px 12px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff',color:'#0f172a'}}>{MESES.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select></label><label style={{display:'grid',gap:7,fontSize:13,fontWeight:700,color:'#475569'}}>Año<select name="anio" defaultValue={String(anio)} style={{height:44,minWidth:130,padding:'8px 12px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff',color:'#0f172a'}}>{anios.map(y=><option key={y} value={y}>{y}</option>)}</select></label><button type="submit" style={{height:44,padding:'0 18px',border:0,borderRadius:8,background:'#047857',color:'#fff',fontWeight:700,cursor:'pointer'}}>Consultar gráficos</button></form><p style={{fontSize:12,color:'#64748b',margin:'12px 0 0'}}>Los cuatro gráficos del mes usan el periodo seleccionado. La evolución mensual compara los 12 meses del año elegido.</p></section>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,420px),1fr))',gap:20}}>
      <Card title="1. Ingresos vs. egresos" note={`Comparación de montos para ${MESES[mes-1]} ${anio}.`}><div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:12,marginBottom:18}}><span style={{color:'#15803d'}}>■ Ingresos: <strong>{dinero(ingresosMes)}</strong></span><span style={{color:'#dc2626'}}>■ Egresos: <strong>{dinero(egresosTotalMes)}</strong></span></div><BarCompare items={[{label:MESES[mes-1],ingresos:ingresosMes,egresos:egresosTotalMes}]} maxValue={Math.max(1,ingresosMes,egresosTotalMes)}/><p style={{fontSize:13,color:'#64748b',marginBottom:0}}>Balance del mes: <strong style={{color:ingresosMes-egresosTotalMes<0?'#dc2626':VERDE}}>{dinero(ingresosMes-egresosTotalMes)}</strong></p></Card>
      <Card title="2. Estado de los cobros" note="Basado en asistencias confirmadas y cuotas aprobadas asociadas a la fecha de pichanga."><Donut pagado={cobrado} pendiente={pendiente}/><p style={{fontSize:12,color:'#64748b',marginBottom:0}}>Cuota configurada: {dinero(montoCuota)} por pelotero asistente.</p></Card>
      <Card title="3. Evolución mensual" note={`Ingresos y egresos por mes durante ${anio}.`}><div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:12,marginBottom:14}}><span style={{color:'#15803d'}}>■ Ingresos</span><span style={{color:'#dc2626'}}>■ Egresos</span></div><div style={{display:'grid',gap:13}}>{mesesAnio.map(m=><div key={m.etiqueta}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}><strong>{m.etiqueta}</strong><span style={{color:'#64748b'}}>{dinero(m.ingreso)} · {dinero(m.egreso)}</span></div><div style={{display:'grid',gap:4}}><div style={{height:9,background:'#e2e8f0',borderRadius:8,overflow:'hidden'}}><div style={{height:'100%',width:`${m.ingreso/maxMensual*100}%`,background:'#16a34a'}}/></div><div style={{height:9,background:'#e2e8f0',borderRadius:8,overflow:'hidden'}}><div style={{height:'100%',width:`${m.egreso/maxMensual*100}%`,background:'#dc2626'}}/></div></div></div>)}</div></Card>
      <Card title="4. Distribución de egresos" note={`Gastos agrupados por concepto durante ${MESES[mes-1]} ${anio}.`}>{gastos.length===0?<p style={{color:'#64748b'}}>No hay egresos para este periodo.</p>:<div style={{display:'grid',gap:14}}>{gastos.map(g=><div key={g.etiqueta}><div style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:13,marginBottom:6}}><span>{g.etiqueta}</span><strong style={{color:'#dc2626'}}>{dinero(g.valor)}</strong></div><div style={{height:12,background:'#fee2e2',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${g.valor/maxGasto*100}%`,background:'#dc2626',borderRadius:99}}/></div></div>)}</div>}</Card>
      <div style={{gridColumn:'1 / -1'}}><Card title="5. Cobros por fecha de pichanga" note={`Cuotas por cobrar y cobradas según asistencias confirmadas en ${MESES[mes-1]} ${anio}.`}><div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:12,marginBottom:14}}><span style={{color:'#15803d'}}>■ Cobrado</span><span style={{color:'#dc2626'}}>■ Pendiente</span></div>{pichangas.length===0?<p style={{color:'#64748b'}}>No hay asistencias confirmadas para este mes.</p>:<div style={{display:'grid',gap:15}}>{pichangas.map(p=><div key={p.fecha}><div style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:13,marginBottom:6}}><strong>{formatoFecha(p.fecha)}</strong><span style={{color:'#64748b'}}>Cobrado {dinero(p.cobrado)} · Pendiente {dinero(p.pendiente)}</span></div><div style={{display:'flex',height:18,background:'#e2e8f0',borderRadius:99,overflow:'hidden'}}><div title={`Cobrado ${dinero(p.cobrado)}`} style={{width:`${(p.cobrado+p.pendiente)>0?p.cobrado/(p.cobrado+p.pendiente)*100:0}%`,background:'#16a34a'}}/><div title={`Pendiente ${dinero(p.pendiente)}`} style={{flex:1,background:'#dc2626'}}/></div></div>)}</div>}</Card></div>
    </div><footer style={{textAlign:'center',color:'#94a3b8',fontSize:12,paddingTop:26}}>Peloteros San Antonio FC · Gráficos del balance</footer>
  </div></main>;
}
