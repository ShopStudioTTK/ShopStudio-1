"""Gera src/lib/conhecimento/material.ts a partir da transcrição (PDF) e do dossiê (DOCX).

Uso: python3 -I scripts/gerar-conhecimento.py <transcricao.pdf> <dossie.docx>
Requer `pdftotext` (poppler-utils). Rode de novo sempre que os documentos mudarem.
"""

import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path

# Vídeos de venda, não de conteúdo: ficam fora do material do assistente.
AULAS_IGNORADAS = {"Upsell 1", "Vídeo Obrigado Upsell"}
SAIDA = Path(__file__).resolve().parent.parent / "src/lib/conhecimento/material.ts"


def renomear(texto: str) -> str:
    # Inclui os erros da transcrição automática ("Chap Club", "Shopping Club").
    return re.sub(r"\b(?:shop|shopp|shopping|chap) ?club\b", "Shop Studio", texto, flags=re.IGNORECASE)


def transcricao(pdf: str) -> str:
    bruto = subprocess.run(["pdftotext", pdf, "-"], check=True, capture_output=True, text=True).stdout
    # Cada aula começa com "AULA NN" seguido do título; antes disso é capa e sumário.
    partes = re.split(r"^\f?AULA \d+\n+", bruto, flags=re.MULTILINE)[1:]
    aulas = []
    for parte in partes:
        # O título da 1ª linha pode quebrar; o nome do arquivo de vídeo vem completo.
        titulo = re.search(r"Título original no Panda Vídeo: (.+?)\.mp4", parte, re.S).group(1)
        titulo = " ".join(titulo.split())
        if titulo in AULAS_IGNORADAS:
            continue
        cabecalho, _, resto = parte.partition("Duração:")
        linhas = resto.split("\n")[1:]  # descarta o resto da linha "Duração: m:ss"
        corpo = []
        for linha in linhas:
            limpa = linha.strip()
            if limpa.startswith("Shop Club — Transcrição") or re.fullmatch(r"\d+", limpa) or "\f" in linha:
                continue
            if re.fullmatch(r"\d+:\d{2} – \d+:\d{2}", limpa):
                corpo.append(f"\n[{limpa}]")
                continue
            corpo.append(limpa)
        texto = re.sub(r"(?<=\S)\n(?=\S)", " ", "\n".join(corpo))  # junta quebras de linha do PDF
        texto = re.sub(r" ?(\[\d+:\d{2} – \d+:\d{2}\]) ?", r"\n\1 ", texto)
        texto = re.sub(r" *\n+", "\n", texto).strip()
        aulas.append(f"## {titulo}\n{texto}")
    return renomear("\n\n".join(aulas))


def dossie(docx: str) -> str:
    xml = zipfile.ZipFile(docx).read("word/document.xml").decode()
    xml = re.sub(r"</w:p>", "\n", xml)
    texto = re.sub(r"<[^>]+>", "", xml)
    texto = texto.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
    return renomear(re.sub(r"\n{2,}", "\n", texto).strip())


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    t, d = transcricao(sys.argv[1]), dossie(sys.argv[2])
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(
        "// Gerado por scripts/gerar-conhecimento.py — não edite à mão.\n"
        'import "server-only";\n\n'
        f"export const TRANSCRICAO = {json.dumps(t, ensure_ascii=False)};\n\n"
        f"export const DOSSIE = {json.dumps(d, ensure_ascii=False)};\n",
        encoding="utf-8",
    )
    print(f"{SAIDA}: transcrição {len(t.split())} palavras, dossiê {len(d.split())} palavras")


if __name__ == "__main__":
    main()
