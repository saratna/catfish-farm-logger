from pathlib import Path
for path in list(Path('app').rglob('*.tsx')) + list(Path('components').rglob('*.tsx')) + list(Path('lib').rglob('*.ts')) + list(Path('lib').rglob('*.tsx')):
    txt=path.read_text(errors='ignore')
    rows=[]
    for i,line in enumerate(txt.splitlines(),1):
        if any('\u3040'<=c<='\u30ff' or '\u4e00'<=c<='\u9fff' for c in line):
            rows.append(f'{i}: {line}')
    if rows:
        print(f'## {path}')
        print('\n'.join(rows))
