import os, io, datetime, sys
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt, matplotlib.patches as mpatches
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image, PageBreak, KeepTogether

# Colors
C = {
 'crit':colors.HexColor('#B91C1C'), 'alta':colors.HexColor('#EA580C'),
 'med':colors.HexColor('#D97706'),  'bx':colors.HexColor('#2563EB'),
 'inf':colors.HexColor('#0EA5E9'),  'ok':colors.HexColor('#059669'),
 'bg':colors.HexColor('#0F172A'),   'bd':colors.HexColor('#3B82F6'),
 'row':colors.HexColor('#F8FAFC'),  'sl':colors.HexColor('#1E293B'),
}
SEV = {'Critica':C['crit'],'Alta':C['alta'],'Media':C['med'],'Baixa':C['bx'],'Informativa':C['inf']}
DATE = datetime.date.today().strftime('%d/%m/%Y')

ACHADOS = [
 ("F-01",1,"Critica","doctor.controller.ts","14-48","IDOR createAtestado: doctorId pelo cliente","POST /api/atestado aceita doctorId do body sem comparar req.user.id. Medico emite atestado em nome de colega.","Medico forja atestados clinicos em nome de qualquer colega.",colors.HexColor('#FEF2F2')),
 ("F-02",3,"Critica","doctor.controller.ts","61-165","IDOR endConsultation: patientId+doctorId pelo cliente","POST /api/end-consultation aceita doctorId do body. Medico encerra consulta de outro, zera has_active_payment.","Adulteracao de prontuarios e bypass financeiro.",colors.HexColor('#FEF2F2')),
 ("F-03",4,"Critica","config.ts","15-35","Defaults publicos: supersecretjwt, admin123, VideoSDK keys reais","JWT_SECRET='supersecretjwt', ADMIN_PASSWORD='admin123', VIDEOSDK keys reais hardcoded. Sem validacao de startup.","Deploy sem .env => qualquer pessoa forja JWTs e loga como admin.",colors.HexColor('#FEF2F2')),
 ("F-04",4,"Critica",".env+backend/.env","16-25/3-7","Credenciais de producao commitadas em texto puro","JWT_SECRET, ADMIN_PASSWORD, LIVEKIT keys, POSTGRES_PASSWORD, REDIS_URL Upstash com senha, VITE_VIDEOSDK_TOKEN (JWT completo) em texto puro no Git.","Acesso total ao banco, Redis e APIs de terceiros para qualquer pessoa com acesso ao repo.",colors.HexColor('#FEF2F2')),
 ("F-05",4,"Alta","docker-compose.yml","10-69","Fallbacks inseguros no docker-compose","POSTGRES_PASSWORD:-admin123, JWT_SECRET:-supersecretmedpronto2026, LIVEKIT_API_KEY:-devkey. Entram em producao se .env ausente.","Deploy descuidado expoe banco e JWT.",colors.HexColor('#FFF7ED')),
 ("F-06",1,"Alta","doctor.controller.ts","224-245","IDOR getDoctorStats: medico ve stats de outro","GET /api/doctor/stats/:id usa :id da URL sem comparar req.user.id.","Dados financeiros de medicos terceiros expostos.",colors.HexColor('#FFF7ED')),
 ("F-07",2,"Alta","misc.routes.ts","52-68","signed-url sem verificacao de posse","Qualquer key aceita, URL /uploads/<key> retornada sem checar ownership.","Qualquer usuario autenticado baixa documentos de outros pacientes.",colors.HexColor('#FFF7ED')),
 ("F-08",3,"Alta","livekit.routes.ts","11-57","LiveKit token sem validacao de sala","POST /api/livekit/token aceita qualquer roomName. Paciente invade sala de outro.","Invasao de teleconsulta medica em andamento.",colors.HexColor('#FFF7ED')),
 ("F-09",1,"Alta","patient.controller.ts","52-106","getPatientHistory: isolamento falha para medicos","Verificacao role=patient nao cobre medicos. Medico acessa historico de qualquer paciente sem vinculo.","Violacao LGPD/CFM.",colors.HexColor('#FFF7ED')),
 ("F-10",1,"Alta","misc.routes.ts","29-48","payment/confirm: medico confirma pagamento de qualquer paciente","Guard role=patient nao cobre medico/admin. Qualquer role confirma pagamento de qualquer patientId.","Bypass do sistema de cobranca.",colors.HexColor('#FFF7ED')),
 ("F-11",1,"Media","index.ts","29","CORS wildcard + credentials:true","callback(null,true) aceita toda origem com credentials:true.","Facilita CSRF e exfiltracao de dados autenticados.",colors.HexColor('#FFFBEB')),
 ("F-12",5,"Baixa","patient.controller.ts","10-46","registerPatient sem validacao de inputs","name,cpf,age,email,birthDate sem validacao de formato, comprimento ou sanitizacao.","Sem risco SQL injection via Prisma. Strings HTML nao escapadas em PDFs.",colors.HexColor('#EFF6FF')),
 ("F-13",2,"Informativa","misc.routes.ts","132-151","videosdk/token disponivel para qualquer role","Pacientes geram tokens VideoSDK ilimitadamente.","Abuso de cota da API VideoSDK.",colors.HexColor('#F0FDF4')),
]

FORTES = [
 ("auth.middleware.ts: JWT robusto","authenticateToken valida JWT em TODAS as rotas protegidas. authorizeAdmin/Doctor verificam role no servidor."),
 ("admin.routes.ts: Dupla protecao","Todas as 6 rotas /api/admin/* exigem authenticateToken + authorizeAdmin. Zero rotas admin sem autenticacao."),
 ("auth.controller.ts: bcrypt","createDoctor usa bcrypt.hash(password,10). doctorAuth usa bcrypt.compare."),
 ("queue.controller.ts: Isolamento de fila","enqueuePatient e takePatient verificam req.user.id para roles patient e doctor."),
 ("patient.controller.ts: Isolamento patient","getPatientHistory e checkQueueStatus bloqueiam paciente de acessar dados de outro."),
 ("auth.routes.ts: Rate limiting no login","Rate limit 20 req/15min em autenticacao. Mitiga forca bruta."),
 ("doctor.controller.ts:startBirdIdFlow","Usa req.user.id para buscar medico, nunca aceita doctorId do body."),
 ("index.ts: Helmet + rate limit global","Helmet ativo em todas as rotas. Rate limit 100 req/min por IP."),
 ("Prisma ORM: Sem SQL Injection","Todas as queries usam parametros, eliminando SQL injection classico."),
]

RECOM = [
 ("P1-URGENTE",C['crit'],"Revogar e rotacionar TODOS os segredos expostos",[
   "Revogar: JWT_SECRET, ADMIN_PASSWORD, LIVEKIT keys, VideoSDK keys, Upstash Redis, PostgreSQL password.",
   "git rm --cached .env backend/.env && adicionar ao .gitignore global.",
   "Usar GitHub Actions Secrets / Vault para injecao em CI/CD.",
   "Adicionar validacao de startup em config.ts para NODE_ENV=production.",
 ]),
 ("P1-URGENTE",C['crit'],"Corrigir IDOR em createAtestado e endConsultation",[
   "Substituir doctorId = req.body.doctorId por const doctorId = req.user.id nos dois controllers.",
   "Guard: if (req.body.doctorId && req.body.doctorId !== req.user.id) return res.status(403).",
 ]),
 ("P1-URGENTE",C['crit'],"Corrigir IDOR em getDoctorStats",[
   "Substituir const id = req.params.id por const id = req.user.id.",
 ]),
 ("P2-Alta",C['alta'],"Verificacao de posse em /documents/signed-url e /livekit/token",[
   "signed-url: buscar documento no banco, verificar patient_id ou doctor_id == req.user.id.",
   "livekit/token: para role=patient exigir roomName === req.user.id.",
 ]),
 ("P2-Alta",C['alta'],"Corrigir CORS",[
   "Substituir callback(null,true) por lista explicita baseada em CORS_ORIGIN.",
   "Aplicar o mesmo em websocket.ts.",
 ]),
 ("P2-Alta",C['alta'],"Restringir getPatientHistory para medicos",[
   "Verificar que medico tem consulta ativa/historica com o paciente antes de retornar dados.",
 ]),
 ("P3-Media",C['med'],"Validacao de inputs com Zod",[
   "Instalar zod e criar schemas para registerPatient, createDoctor, endConsultation, createAtestado.",
   "Validar CPF, email, datas e comprimentos antes de persistir.",
 ]),
 ("P3-Media",C['med'],"Validacao de startup para segredos",[
   "Em config.ts: if (NODE_ENV=production && jwtSecret in INSECURE_DEFAULTS) throw Error.",
 ]),
]

ISSUES = [
 (1,"[Seguranca] IDOR critico em createAtestado e endConsultation","security, critica",
  "POST /api/atestado e POST /api/end-consultation aceitam doctorId via req.body sem verificar req.user.id.\nEvidencia: doctor.controller.ts:16  const { patientId, doctorId, ... } = req.body;\nCorrecao: const doctorId = req.user.id nos dois controllers.\nCriterios: [ ] doctorId sempre de req.user.id; [ ] Medico A nao cria atestado com doctorId de B."),
 (2,"[Seguranca] IDOR em getDoctorStats","security, alta",
  "GET /api/doctor/stats/:id usa :id da URL sem comparar req.user.id.\nEvidencia: doctor.controller.ts:226  const id = req.params.id;\nCorrecao: const id = req.user.id.\nCriterios: [ ] Retorna 403 se :id != req.user.id; [ ] Medico A nao acessa stats de B."),
 (3,"[Seguranca] Credenciais commitadas + defaults inseguros","security, critica",
  ".env e backend/.env rastreados pelo Git com JWT, LIVEKIT, POSTGRES, REDIS, VIDEOSDK em texto puro.\nconfig.ts: jwtSecret || 'supersecretjwt', adminPassword || 'admin123', VideoSDK keys reais hardcoded.\nCorrecao: git rm --cached .env backend/.env; rotacionar todos; validacao de startup em config.ts.\nCriterios: [ ] .env removido do Git; [ ] segredos rotacionados; [ ] startup rejeita defaults."),
 (4,"[Seguranca] Falta verificacao de posse em signed-url e livekit/token","security, alta",
  "misc.routes.ts:53-67  const url = /uploads/; // sem verificacao de posse.\nlivekit.routes.ts:13-51  const { roomName } = req.body; // nao validado contra req.user.id.\nCorrecao: verificar posse no banco antes de retornar URLs e tokens.\nCriterios: [ ] Paciente A nao baixa documento de B; [ ] Nao obtem token para sala de B."),
 (5,"[Seguranca] CORS wildcard com credentials=true","security, media",
  "index.ts:29  origin: (origin, callback) => callback(null, true), credentials: true.\nwebsocket.ts:11  mesmo problema.\nCorrecao: const allowed = CORS_ORIGIN.split(','); callback(null, allowed.includes(origin) || !origin).\nCriterios: [ ] Origem desconhecida recebe erro CORS; [ ] Testes cobrem bloqueio."),
]

def sv(s):
    return SEV.get(s, C['inf'])

def rosca():
    cnt = {}
    for a in ACHADOS: cnt[a[2]] = cnt.get(a[2],0)+1
    lbls = list(cnt.keys()); vals = [cnt[l] for l in lbls]
    cm2 = {'Critica':'#B91C1C','Alta':'#EA580C','Media':'#D97706','Baixa':'#2563EB','Informativa':'#0EA5E9'}
    fig,ax = plt.subplots(figsize=(4.5,3.5),dpi=110)
    w,t,at = ax.pie(vals,colors=[cm2.get(l,'#94A3B8') for l in lbls],autopct='%1.0f%%',startangle=90,wedgeprops={'lw':1.5,'ec':'white'},pctdistance=0.75)
    for x in at: x.set_fontsize(9); x.set_color('white'); x.set_fontweight('bold')
    ax.add_patch(plt.Circle((0,0),0.5,color='white'))
    ax.text(0,0,f'{sum(vals)}\nachados',ha='center',va='center',fontsize=10,fontweight='bold',color='#334155')
    ax.legend(handles=[mpatches.Patch(color=cm2.get(l,'#94A3B8'),label=f'{l} ({cnt[l]})') for l in lbls],loc='lower center',bbox_to_anchor=(0.5,-0.2),ncol=2,fontsize=8,frameon=False)
    ax.set_title('Por Severidade',fontsize=10,fontweight='bold',color='#0F172A',pad=8)
    plt.tight_layout(); buf=io.BytesIO(); plt.savefig(buf,format='png',bbox_inches='tight',transparent=True); plt.close(fig); buf.seek(0); return buf

def barras():
    cats={1:'Banco Sem Tranca',2:'Permissao Browser',3:'IDOR',4:'Chaves Expostas',5:'Inputs s/Trat.'}
    cnt={k:0 for k in cats}
    for a in ACHADOS:
        if a[1] in cnt: cnt[a[1]]+=1
    lbls=[cats[k] for k in cats]; vals=[cnt[k] for k in cats]
    fig,ax=plt.subplots(figsize=(5,3.2),dpi=110)
    bars=ax.barh(lbls,vals,color=['#3B82F6','#8B5CF6','#EC4899','#F59E0B','#10B981'],height=0.55,edgecolor='white')
    for bar,v in zip(bars,vals):
        if v>0: ax.text(bar.get_width()+0.05,bar.get_y()+bar.get_height()/2,str(v),va='center',fontsize=9,fontweight='bold',color='#334155')
    ax.set_xlim(0,max(vals)+1); ax.set_xlabel('No. Achados',fontsize=8,color='#64748B')
    ax.set_title('Por Categoria',fontsize=10,fontweight='bold',color='#0F172A',pad=8)
    ax.tick_params(axis='y',labelsize=8); ax.tick_params(axis='x',labelsize=7)
    [ax.spines[s].set_visible(False) for s in ['top','right']]
    ax.set_facecolor('#F8FAFC'); fig.patch.set_facecolor('#F8FAFC')
    plt.tight_layout(); buf=io.BytesIO(); plt.savefig(buf,format='png',bbox_inches='tight'); plt.close(fig); buf.seek(0); return buf

def hf(cv,doc):
    cv.saveState(); w,h=A4
    cv.setFillColor(C['bg']); cv.rect(0,h-1.2*cm,w,1.2*cm,fill=1,stroke=0)
    cv.setFillColor(colors.white); cv.setFont('Helvetica-Bold',8)
    cv.drawString(2*cm,h-0.75*cm,"Relatorio de Auditoria de Seguranca - MedPronto")
    cv.setFont('Helvetica',8); cv.drawRightString(w-2*cm,h-0.75*cm,DATE)
    cv.setFillColor(C['sl']); cv.rect(0,0,w,0.9*cm,fill=1,stroke=0)
    cv.setFillColor(colors.white); cv.setFont('Helvetica',7)
    cv.drawCentredString(w/2,0.32*cm,f"Pagina {doc.page}  -  Confidencial  -  MedPronto Telemedicina")
    cv.restoreState()

def mk(n,fs,ln,tc,fn='Helvetica',**kw):
    return ParagraphStyle(n,fontSize=fs,leading=ln,textColor=tc,fontName=fn,**kw)

OUT = sys.argv[1] if len(sys.argv)>1 else r'c:\Users\pesso\OneDrive\Área de Trabalho\Saas\docs\security-audit\relatorio-auditoria-seguranca.pdf'
doc=SimpleDocTemplate(OUT,pagesize=A4,rightMargin=2*cm,leftMargin=2*cm,topMargin=2.5*cm,bottomMargin=1.8*cm)
sh1=mk('h1',14,20,colors.HexColor('#0F172A'),'Helvetica-Bold',spaceBefore=12,spaceAfter=5)
sh2=mk('h2',11,15,colors.HexColor('#1E293B'),'Helvetica-Bold',spaceBefore=8,spaceAfter=4)
sb =mk('b',9,13,colors.HexColor('#334155'),leftIndent=12,spaceAfter=2)
sn =mk('n',8,12,colors.HexColor('#64748B'),'Helvetica-Oblique',spaceAfter=6)
sc =mk('c',7.5,11,colors.HexColor('#1E293B'),'Courier',backColor=colors.HexColor('#F1F5F9'))
story=[]

# CAPA
story.append(Spacer(1,1.5*cm))
ct=Table([[Paragraph("Relatorio de Auditoria de Seguranca",mk('t',20,26,colors.white,'Helvetica-Bold',alignment=TA_CENTER))]],colWidths=[16*cm])
ct.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),C['bg']),('TOPPADDING',(0,0),(-1,-1),28),('BOTTOMPADDING',(0,0),(-1,-1),12),('LEFTPADDING',(0,0),(-1,-1),20),('RIGHTPADDING',(0,0),(-1,-1),20)]))
story.append(ct); story.append(Spacer(1,0.3*cm))
pt=Table([[Paragraph("<b>MedPronto Telemedicina</b>",mk('p',13,17,colors.HexColor('#94A3B8'),alignment=TA_CENTER))]],colWidths=[16*cm])
pt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),C['sl']),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10)]))
story.append(pt); story.append(Spacer(1,0.8*cm))
md=[['Data:',DATE],['Escopo:','Codigo-fonte completo: backend Node.js/Express/Prisma, frontend React/Vite, docker-compose, .env'],['Metodologia:','Revisao estatica, rastreamento autenticacao->controller->query, analise de segredos e deploy.'],['Ferramenta:','Antigravity IDE - Auditoria automatizada com revisao manual']]
mt=Table(md,colWidths=[3.5*cm,12.5*cm])
mt.setStyle(TableStyle([('FONTNAME',(0,0),(0,-1),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8.5),('TEXTCOLOR',(0,0),(0,-1),C['bg']),('TEXTCOLOR',(1,0),(1,-1),colors.HexColor('#334155')),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('ROWBACKGROUNDS',(0,0),(-1,-1),[colors.HexColor('#F8FAFC'),colors.white]),('LINEBELOW',(0,0),(-1,-2),0.3,colors.HexColor('#E2E8F0')),('VALIGN',(0,0),(-1,-1),'TOP')]))
story.append(mt); story.append(PageBreak())

# RESUMO EXECUTIVO
story.append(Paragraph("1. Resumo Executivo",sh1))
story.append(HRFlowable(width='100%',thickness=1,color=colors.HexColor('#E2E8F0'),spaceAfter=8))
sc2={}
for a in ACHADOS: sc2[a[2]]=sc2.get(a[2],0)+1
sords=['Critica','Alta','Media','Baixa','Informativa']
rm={'Critica':'Maximo - acao imediata','Alta':'Alto - corrigir em 7 dias','Media':'Moderado','Baixa':'Baixo - monitorar','Informativa':'Melhoria de postura'}
sd=[['Severidade','Achados','Risco']]
for s in sords:
    if s in sc2: sd.append([s,str(sc2[s]),rm.get(s,'')])
st2=Table(sd,colWidths=[4*cm,2.5*cm,9.5*cm])
ts=[('BACKGROUND',(0,0),(-1,0),C['bg']),('TEXTCOLOR',(0,0),(-1,0),colors.white),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),('GRID',(0,0),(-1,-1),0.3,colors.HexColor('#E2E8F0')),('ROWBACKGROUNDS',(0,1),(-1,-1),[C['row'],colors.white])]
ks=list(sc2.keys())
for s in sords:
    if s in sc2:
        r=ks.index(s)+1
        ts.extend([('TEXTCOLOR',(0,r),(0,r),sv(s)),('FONTNAME',(0,r),(0,r),'Helvetica-Bold')])
st2.setStyle(TableStyle(ts))
story.append(st2); story.append(Spacer(1,0.4*cm))
ir=Image(rosca(),width=7.5*cm,height=5.5*cm); ib=Image(barras(),width=8.5*cm,height=5.5*cm)
gt=Table([[ir,ib]],colWidths=[8*cm,9*cm])
gt.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE'),('ALIGN',(0,0),(-1,-1),'CENTER')]))
story.append(gt); story.append(PageBreak())

# STACK
story.append(Paragraph("2. Stack Detectada e Mapeamento de Categorias",sh1))
story.append(HRFlowable(width='100%',thickness=1,color=colors.HexColor('#E2E8F0'),spaceAfter=8))
skd=[['Componente','Tecnologia'],['Linguagem','TypeScript (Node.js 18 backend; React 18 frontend)'],['Framework','Express.js'],['ORM','Prisma ORM (PostgreSQL)'],['Auth','JWT - roles: patient, doctor, admin'],['Frontend','React + Vite + Zustand + React Router'],['Deploy','Docker Compose + Caddy + LiveKit SFU + BullMQ/Redis'],['Isolamento','Filtro manual por user_id na app layer (sem RLS)'],['Auth Admin','Email fixo + ADMIN_PASSWORD do .env'],['Cat.1','Filtros WHERE ausentes/incompletos nos controllers'],['Cat.2','Gates de role no frontend sem check equivalente no backend'],['Cat.3','IDs de rota/body nao comparados com req.user.id'],['Cat.4','.env commitado, defaults no config.ts e docker-compose.yml'],['Cat.5','Sem sanitizacao/validacao de schema nos endpoints']]
skt=Table(skd,colWidths=[5*cm,11*cm])
skt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),C['sl']),('TEXTCOLOR',(0,0),(-1,0),colors.white),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTNAME',(0,1),(0,-1),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('ROWBACKGROUNDS',(0,1),(-1,-1),[C['row'],colors.white]),('GRID',(0,0),(-1,-1),0.3,colors.HexColor('#E2E8F0')),('TEXTCOLOR',(0,1),(0,-1),colors.HexColor('#1E40AF')),('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,9),(-1,-1),colors.HexColor('#F0F9FF')),('TEXTCOLOR',(0,9),(0,-1),colors.HexColor('#0369A1'))]))
story.append(skt); story.append(PageBreak())

# PONTOS FORTES
story.append(Paragraph("3. Pontos Fortes - O que esta protegido",sh1))
story.append(HRFlowable(width='100%',thickness=1,color=C['ok'],spaceAfter=8))
for t,d in FORTES:
    bl=Table([[Paragraph(f"OK  {t}",mk('pft',9,12,colors.HexColor('#065F46'),'Helvetica-Bold')),Paragraph(d,mk('pfd',8.5,13,colors.HexColor('#1F2937')))],],colWidths=[6.5*cm,9.5*cm])
    bl.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#ECFDF5')),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),('LEFTPADDING',(0,0),(0,-1),8),('RIGHTPADDING',(-1,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),0.3,colors.HexColor('#A7F3D0'))]))
    story.append(bl); story.append(Spacer(1,0.1*cm))
story.append(PageBreak())

# ACHADOS
story.append(Paragraph("4. Achados Detalhados por Categoria",sh1))
story.append(HRFlowable(width='100%',thickness=1,color=colors.HexColor('#E2E8F0'),spaceAfter=8))
hr=[['ID','Cat','Sev','Arquivo:Linha','Titulo']]
rows2=hr+[[a[0],str(a[1]),a[2],f"{a[3].split('/')[-1]}:{a[4]}",a[5]] for a in ACHADOS]
tr=Table(rows2,colWidths=[1.2*cm,1*cm,2*cm,4*cm,7.8*cm])
trs=[('BACKGROUND',(0,0),(-1,0),C['bg']),('TEXTCOLOR',(0,0),(-1,0),colors.white),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),7.5),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('GRID',(0,0),(-1,-1),0.3,colors.HexColor('#E2E8F0')),('ROWBACKGROUNDS',(0,1),(-1,-1),[C['row'],colors.white]),('VALIGN',(0,0),(-1,-1),'TOP'),('FONTNAME',(0,1),(0,-1),'Courier')]
for i,a in enumerate(ACHADOS): trs.extend([('TEXTCOLOR',(2,i+1),(2,i+1),sv(a[2])),('FONTNAME',(2,i+1),(2,i+1),'Helvetica-Bold')])
tr.setStyle(TableStyle(trs)); story.append(tr); story.append(Spacer(1,0.4*cm))
cats={1:'Banco Sem Tranca',2:'Permissao no Browser',3:'IDOR',4:'Chaves Expostas',5:'Inputs Sem Tratamento'}
prev=-1
for a in ACHADOS:
    aid,cn,sev,arq,ln,tit,desc,expl,bg=a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8]
    if cn!=prev:
        prev=cn; story.append(Spacer(1,0.3*cm)); story.append(Paragraph(f"4.{cn} - {cats[cn]}",sh2))
    cs=sv(sev)
    hi=Table([[Paragraph(f"<b>{aid}</b>",mk('ai',9,11,colors.HexColor('#1E3A5F'),'Courier-Bold')),Paragraph(tit,mk('ti',9.5,13,C['bg'],'Helvetica-Bold')),Paragraph(f"* {sev.upper()}",mk('ch',8,11,cs,'Helvetica-Bold'))]],colWidths=[1.5*cm,11*cm,3.5*cm])
    hi.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#F1F5F9')),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LEFTPADDING',(0,0),(0,-1),8),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(KeepTogether([hi]))
    bd=Table([['Arquivo:',f"{arq}:{ln}"],['Descricao:',desc],['Explorabilidade:',expl]],colWidths=[2.5*cm,13.5*cm])
    bd.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),bg),('FONTNAME',(0,0),(0,-1),'Helvetica-Bold'),('FONTNAME',(1,0),(1,-1),'Helvetica'),('FONTSIZE',(0,0),(-1,-1),8.5),('FONTNAME',(1,0),(1,0),'Courier'),('FONTSIZE',(1,0),(1,0),8),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LEFTPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,0),(-1,-2),0.3,colors.HexColor('#E2E8F0')),('VALIGN',(0,0),(-1,-1),'TOP')]))
    story.append(bd); story.append(Spacer(1,0.2*cm))
story.append(PageBreak())

# RECOMENDACOES
story.append(Paragraph("5. Recomendacoes Priorizadas",sh1))
story.append(HRFlowable(width='100%',thickness=1,color=colors.HexColor('#E2E8F0'),spaceAfter=8))
for pr,pc,ti,ps in RECOM:
    hr2=Table([[Paragraph(f"<b>{pr}</b>",mk('pr',8.5,11,colors.white,'Helvetica-Bold')),Paragraph(f"<b>{ti}</b>",mk('tr',9,13,C['bg'],'Helvetica-Bold'))]],colWidths=[3*cm,13*cm])
    hr2.setStyle(TableStyle([('BACKGROUND',(0,0),(0,-1),pc),('BACKGROUND',(1,0),(1,-1),colors.HexColor('#F1F5F9')),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LEFTPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(hr2)
    for p in ps: story.append(Paragraph(f"  - {p}",sb))
    story.append(Spacer(1,0.3*cm))
story.append(PageBreak())

# ISSUES
story.append(Paragraph("6. Issues para o GitHub",sh1))
story.append(HRFlowable(width='100%',thickness=1,color=colors.HexColor('#E2E8F0'),spaceAfter=6))
story.append(Paragraph("Cada bloco contem o texto de uma GitHub Issue pronta para copiar e colar.",sn))
for n,ti,lb,bo in ISSUES:
    story.append(Spacer(1,0.2*cm))
    dl=Table([[Paragraph(f"--- ISSUE {n} ---",mk('dl',9,11,C['bd'],'Courier-Bold'))]],colWidths=[16*cm])
    dl.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),C['bg']),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LEFTPADDING',(0,0),(-1,-1),8)]))
    story.append(dl)
    txt=f"Titulo: {ti}\nLabels: {lb}\n\n{bo}"
    story.append(Paragraph(txt.replace('\n','<br/>'),sc))
    fd=Table([[Paragraph(f"--- FIM ISSUE {n} ---",mk('fd',9,11,colors.HexColor('#94A3B8'),'Courier-Bold'))]],colWidths=[16*cm])
    fd.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),C['sl']),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('LEFTPADDING',(0,0),(-1,-1),8)]))
    story.append(fd); story.append(Spacer(1,0.3*cm))

doc.build(story,onFirstPage=hf,onLaterPages=hf)
print(f"OK gerado: {OUT}")
