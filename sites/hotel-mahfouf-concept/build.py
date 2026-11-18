import pathlib
d=pathlib.Path(__file__).parent
s=(d/'src.html').read_text()
v=''.join('<script>\n'+(d/'vendor'/f).read_text()+'\n</script>\n' for f in ['gsap.min.js','ScrollTrigger.min.js','lenis.min.js'])
(d/'index.html').write_text(s.replace('<!--VENDOR-->',v))
print('ok', len(s.replace('<!--VENDOR-->',v)))
