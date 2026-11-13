# Synthèse des effets sonores (bruit filtré, sinus, réverbération), sans ressource externe.
import numpy as np
from scipy import signal
SR=48000
rng=np.random.default_rng(7)
def t_(d): return np.arange(int(d*SR))/SR
def env_ad(n,a,d,curve=3.0):
    na=max(1,int(a*SR)); nd=max(1,n-na)
    return np.concatenate([np.linspace(0,1,na)**2,(1-np.linspace(0,1,nd))**curve])[:n]
def pink(n):
    w=rng.standard_normal(n); b,a=[0.049922035,-0.095993537,0.050612699,-0.004408786],[1,-2.494956002,2.017265875,-0.522189400]
    p=signal.lfilter(b,a,w); return p/np.abs(p).max()
def bp_sweep(x,f0,f1,q=2.0,curve=1.0):
    # time-varying bandpass via short blocks of SVF
    n=len(x); y=np.zeros(n); lp=bp=0.0
    fs=f0*(f1/f0)**(np.linspace(0,1,n)**curve)
    for i in range(n):
        f=2*np.sin(np.pi*fs[i]/SR); hp=x[i]-lp-bp/q; bp+=f*hp; lp+=f*bp; y[i]=bp
    return y/ (np.abs(y).max()+1e-9)
def pan(x,p):  # p in [-1,1] scalar or array
    p=np.broadcast_to(p,x.shape); a=(p+1)*np.pi/4
    return np.stack([x*np.cos(a),x*np.sin(a)],1)
_IR=None
def reverb(st,mix=.25,dec=1.6):
    global _IR
    if _IR is None:
        n=int(dec*SR); e=np.exp(-6.9*np.arange(n)/n)
        ir=np.stack([rng.standard_normal(n)*e,rng.standard_normal(n)*e],1)
        b,a=signal.butter(2,6000/(SR/2)); ir=signal.lfilter(b,a,ir,axis=0); _IR=ir/np.sqrt((ir**2).sum(0))
    wet=np.stack([signal.fftconvolve(st[:,c],_IR[:,c]) for c in range(2)],1)
    out=np.zeros_like(wet); out[:len(st)]+=st*(1-mix); out+=wet*mix
    return out
def norm(x,db=-6): return x/(np.abs(x).max()+1e-9)*10**(db/20)

def whoosh(d=0.7,f0=300,f1=3500,p0=-0.6,p1=0.6,peak=0.6):
    n=int(d*SR); x=bp_sweep(pink(n),f0,f1,q=1.4)
    e=np.concatenate([np.linspace(0,1,int(n*peak))**2.2,(1-np.linspace(0,1,n-int(n*peak)))**1.6])
    return reverb(norm(pan(x*e,np.linspace(p0,p1,n))),.18)
def pop(f0=900,f1=180,d=0.18):
    t=t_(d); f=f1+(f0-f1)*np.exp(-t*38); ph=2*np.pi*np.cumsum(f)/SR
    x=np.sin(ph)*env_ad(len(t),.002,d,4)
    click=rng.standard_normal(len(t))*np.exp(-t*900)*.3
    return norm(pan(x+click,0))
def shimmer(d=1.4,base=2400,n_=9,panp=0):
    t=t_(d); x=np.zeros(len(t))
    for k in range(n_):
        st=rng.uniform(0,.35); f=base*rng.choice([1,1.25,1.5,2,2.5,3])*rng.uniform(.99,1.01)
        m=t>=st; tt=t[m]-st; x[m]+=np.sin(2*np.pi*f*tt)*np.exp(-tt*rng.uniform(4,9))*rng.uniform(.4,1)
    return reverb(norm(pan(x,panp)),.4,2.2)
def thump(f0=120,f1=45,d=0.5):
    t=t_(d); f=f1+(f0-f1)*np.exp(-t*25); x=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*7)
    return norm(pan(x,0))
def impact(d=2.0):
    t=t_(d); f=38+80*np.exp(-t*18); sub=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*2.2)
    nz=pink(len(t))*np.exp(-t*9); b,a=signal.butter(2,2500/(SR/2)); nz=signal.lfilter(b,a,nz)
    return reverb(norm(pan(sub*1.0+nz*.6,0)),.3,2.5)
def riser(d=1.2,f0=400,f1=6000):
    n=int(d*SR); x=bp_sweep(pink(n),f0,f1,q=3,curve=2)
    t=t_(d); tone=np.sin(2*np.pi*np.cumsum(220*2**(2*t/d))/SR)*.25
    e=np.linspace(0,1,n)**2.5
    return reverb(norm(pan((x+tone)*e,np.sin(t*9)*.3)),.25)
def rev_swell(d=0.9): return riser(d,800,9000)
def tick(f=2200,d=0.05,panp=0):
    t=t_(d); x=np.sin(2*np.pi*f*t)*np.exp(-t*90)+rng.standard_normal(len(t))*np.exp(-t*600)*.15
    return norm(pan(x,panp))
def scan(d=2.4):
    t=t_(d); n=len(t); nz=bp_sweep(pink(n),1500,5000,q=6)
    trem=.5+.5*np.sign(np.sin(2*np.pi*14*t)); e=np.minimum(1,t/.3)*np.minimum(1,(d-t)/.5)
    hum=np.sin(2*np.pi*110*t)*.3+np.sin(2*np.pi*220.5*t)*.15
    return reverb(norm(pan(nz*trem*e*.5+hum*e,0)),.3)

def music(dur,bpm=96):
    # soft ambient-tech bed: pad + sub + soft kick/hat, Am - F - C - G
    t=t_(dur); n=len(t); out=np.zeros((n,2)); beat=60/bpm; bar=beat*4
    chords=[[57,60,64,69],[53,57,60,65],[48,55,60,64],[55,59,62,67]]
    mtof=lambda m:440*2**((m-69)/12)
    pad=np.zeros((n,2))
    for ci in range(int(dur/bar)+1):
        st=ci*bar*1.0; ch=chords[ci%4]; i0=int(st*SR); i1=min(n,int((st+bar)*SR)+int(.6*SR))
        if i0>=n: break
        tt=t[i0:i1]-st
        e=np.minimum(1,tt/.6)*np.clip((bar+.6-tt)/.6,0,1)
        for m in ch:
            for det,pp in ((-0.12,-.5),(0.12,.5)):
                f=mtof(m)*2**(det/12)
                w=signal.sawtooth(2*np.pi*f*tt+rng.uniform(0,6))
                pad[i0:i1]+=pan(w*e*.06,pp)
        # sub bass root
        f=mtof(ch[0]-12); pad[i0:i1]+=pan(np.sin(2*np.pi*f*tt)*e*.22,0)
    b,a=signal.butter(2,1400/(SR/2)); pad=signal.lfilter(b,a,pad,axis=0)
    out+=pad
    # drums
    k=thump(110,42,.35)[:,0]*.55; nb=int(dur/beat)+1
    hb,ha=signal.butter(2,8000/(SR/2),'high')
    for b_ in range(nb):
        s=int(b_*beat*SR)
        if b_%2==0 and s+len(k)<n: out[s:s+len(k)]+=np.stack([k,k],1)
        for h in (0,.5):
            s2=int((b_+h)*beat*SR); L=int(.05*SR)
            if s2+L<n:
                hh=signal.lfilter(hb,ha,rng.standard_normal(L))*np.exp(-np.arange(L)/SR*80)*(.10 if h else .06)
                out[s2:s2+L]+=pan(hh,.25 if h else -.25)
    return reverb(out,.2,2.0)
