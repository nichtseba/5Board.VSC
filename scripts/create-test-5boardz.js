const JSZip = require('../extension/node_modules/jszip');
const fs = require('fs');
const path = require('path');

const manifest = {
  title: 'Code Block Test',
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
  version: '4.0.0',
};

const content = {
  elements: [
    {
      id: 'heading-1',
      type: 'heading',
      layout: { xPos: 0, yPos: 0, width: 12, height: 2 },
      style: { visible: true },
      data: { level: 1, content: 'Code Block Test' },
    },
    {
      id: 'code-greet',
      type: 'code',
      layout: { xPos: 0, yPos: 3, width: 36, height: 10 },
      style: { visible: true },
      data: {
        codeBlockId: 'block-greet',
        fileName: 'Student.java',
        language: 'java',
        content: '',
      },
    },
    {
      id: 'code-main',
      type: 'code',
      layout: { xPos: 0, yPos: 14, width: 36, height: 10 },
      style: { visible: true },
      data: {
        codeBlockId: 'block-main',
        fileName: 'Student.java',
        language: 'java',
        content: '',
      },
    },
  ],
};

const javaSource = [
  'public class Student {',
  '    // <block id="block-greet">',
  '    public String greet(String name) {',
  '        return "Hallo, " + name + "!";',
  '    }',
  '    // </block>',
  '',
  '    // <block id="block-main">',
  '    public static void main(String[] args) {',
  '        Student s = new Student();',
  '        System.out.println(s.greet("Tom"));',
  '    }',
  '    // </block>',
  '}',
].join('\n');

async function main() {
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('content.json', JSON.stringify(content, null, 2));
  zip.file('src/java/Student.java', javaSource);

  const buf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const outPath = path.resolve(__dirname, '..', 'test.5boardz');
  fs.writeFileSync(outPath, buf);
  console.log(`Created ${outPath} (${buf.length} bytes)`);
}

main().catch(console.error);
