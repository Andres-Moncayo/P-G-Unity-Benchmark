import codecs
with codecs.open('src/services/schemas.ts', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()
content = content.replace('\x00', '')
with codecs.open('src/services/schemas.ts', 'w', encoding='utf-8') as f:
    f.write(content)
