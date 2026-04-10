const Y = require('yjs');

const doc = new Y.Doc();
const yText = doc.getText('test');

doc.on('beforeTransaction', (tr) => {
  console.log('beforeTransaction fired');
  tr.meta.set('before', yText.toString());
});

doc.on('update', (update, origin, doc, tr) => {
  console.log('update fired, origin:', origin);
  console.log('transaction exists:', !!tr);
  if (tr) {
    const before = tr.meta.get('before');
    console.log('before text from meta:', before);
    console.log('after text:', yText.toString());
    
    for (const [type, events] of tr.changedParentTypes.entries()) {
        console.log('Changed type name:', type.constructor.name);
        if (type instanceof Y.Text) {
            console.log('Is Y.Text: true');
            events.forEach(event => {
                console.log('Delta:', JSON.stringify(event.delta));
            });
        } else {
            console.log('Is Y.Text: false');
        }
    }
  }
});

console.log('--- Local Edit ---');
doc.transact(() => {
  yText.insert(0, 'hello');
}, 'local-origin');

console.log('\n--- Remote-style Update Application ---');
const doc2 = new Y.Doc();
const yText2 = doc2.getText('test');
yText2.insert(0, 'world');
const update = Y.encodeStateAsUpdate(doc2);

Y.applyUpdate(doc, update, 'remote-origin');
