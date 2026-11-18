import pathlib, re, base64, json
d=pathlib.Path(__file__).parent
s=(d/'src.html').read_text()
three=(d/'vendor'/'three.min.js').read_text()
three=re.sub(r"^console\.warn\([^\n]*\),\n", "void 0,\n", three, count=1)
v='<script>\n'+three+'\n</script>\n'+''.join('<script>\n'+(d/'vendor'/f).read_text()+'\n</script>\n' for f in ['gsap.min.js','ScrollTrigger.min.js','lenis.min.js'])
imgs={f.stem:'data:image/webp;base64,'+base64.b64encode(f.read_bytes()).decode() for f in sorted((d/'assets').glob('*.webp'))}
s=s.replace('<!--IMAGES-->','<script>window.HM_IMG='+json.dumps(imgs)+';</script>')
s=s.replace('<!--VENDOR-->',v)
s=s.replace('</body>','<script>\n'+(d/'scene3d.js').read_text()+'\n</script>\n</body>')
(d/'index.html').write_text(s)
print('ok', round(len(s)/1e6,2),'MB')
