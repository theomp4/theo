import pathlib, re
d=pathlib.Path(__file__).parent
s=(d/'src.html').read_text()
three=(d/'vendor'/'three.min.js').read_text()
three=re.sub(r"^console\.warn\([^\n]*\),\n", "void 0,\n", three, count=1)
libs={'gsap.min.js':None,'ScrollTrigger.min.js':None,'lenis.min.js':None}
v='<script>\n'+three+'\n</script>\n'+''.join('<script>\n'+(d/'vendor'/f).read_text()+'\n</script>\n' for f in libs)
s=s.replace('<!--VENDOR-->',v)
# la scène 3D doit tourner APRÈS le script principal (qui crée les ancres et window.HM)
scene='<script>\n'+(d/'scene3d.js').read_text()+'\n</script>\n'
s=s.replace('<!--SCENE3D-->\n','')
s=s.replace('</body>', scene+'</body>')
(d/'index.html').write_text(s)
print('ok', len(s))
