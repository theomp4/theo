import pathlib, re, base64, json, io
from PIL import Image
d=pathlib.Path(__file__).parent
s=(d/'src.html').read_text()
three=(d/'vendor'/'three.min.js').read_text()
three=re.sub(r"^console\.warn\([^\n]*\),\n", "void 0,\n", three, count=1)
imgs={}
for f in sorted((d/'assets').glob('*.webp')):
    if ('"'+f.stem+'"') not in s: continue
    im=Image.open(f).convert('RGB'); im.thumbnail((760,1140))
    b=io.BytesIO(); im.save(b,'WEBP',quality=80,method=6)
    imgs[f.stem]='data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
print('images:', ', '.join(imgs))
s=s.replace('<!--IMAGES-->','<script>window.HM_IMG='+json.dumps(imgs)+';</script>')
s=s.replace('<!--THREE-->','<script>\n'+three+'\n</script>')
(d/'index.html').write_text(s)
print('ok', round(len(s)/1e6,2),'MB')
