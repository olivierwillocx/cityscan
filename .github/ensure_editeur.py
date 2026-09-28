# Filet de securite : garantit la mention "Editeur responsable" dans index.html
# a chaque deploiement, quel que soit ce que produit le generateur du site.
import sys
p = "index.html"
s = open(p, encoding="utf-8").read()
if "Avenue Huart Hamoir" in s:
    print("Editeur responsable deja present — rien a faire.")
    sys.exit(0)
line = ('<div class="er-legal" style="max-width:1240px;margin:0 auto;'
        'padding:8px 20px 28px;color:#7a7a7a;font-size:12px;line-height:1.5">'
        'Éditeur responsable : Olivier Willocx, Avenue Huart Hamoir 71, 1030 Bruxelles '
        '— Verantwoordelijke uitgever: Huart Hamoirlaan 71, 1030 Brussel</div>\n')
i = s.rfind("</body>")
if i == -1:
    print("::warning::balise </body> introuvable — mention non injectee.")
    sys.exit(0)
s = s[:i] + line + s[i:]
open(p, "w", encoding="utf-8").write(s)
print("Editeur responsable injecte (filet de securite deploiement).")
